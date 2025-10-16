# inventory/views.py

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, F, Q, Value, DecimalField
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from .models import Tool, Loan
from .serializers import ToolSerializer, LoanSerializer
from django.db.models import Count, Sum, F
from django.db.models.functions import TruncMonth

# Isenta o CSRF para permitir testes via Postman/APIs, mas em produção,
# a autenticação por token (como JWT) é o ideal.
@method_decorator(csrf_exempt, name='dispatch')
class ToolViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite que as ferramentas sejam visualizadas ou editadas.
    """
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    permission_classes = [IsAuthenticated]
    
@method_decorator(csrf_exempt, name='dispatch')
class LoanViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gerenciar empréstimos de ferramentas.
    """
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """
        Ao criar um novo empréstimo, o usuário logado é automaticamente
        definido como o mutuário (borrower). A validação de estoque é
        feita no LoanSerializer.
        """
        # Nota: Se o 'borrower' puder ser selecionado na interface,
        # você pode remover a linha abaixo e enviar o borrower_id do frontend.
        # Caso contrário, isso garante que o usuário logado fez o empréstimo.
        serializer.save(borrower=self.request.user)

    def perform_update(self, serializer):
        """
        Salva as alterações no empréstimo. A validação de estoque para
        quantidades alteradas é feita no LoanSerializer.
        """
        serializer.save()

    def perform_destroy(self, instance):
        """
        Ao deletar um empréstimo, a quantidade da ferramenta ficará disponível
        automaticamente, pois a propriedade 'available_quantity' será recalculada.
        """
        instance.delete()

    @action(detail=True, methods=["post"], url_path='return')
    def return_tool(self, request, pk=None):
        """
        Ação para marcar um empréstimo como devolvido.
        """
        loan = self.get_object()
        if loan.returned_date:
            return Response({"detail": "Esta ferramenta já foi devolvida."}, status=status.HTTP_400_BAD_REQUEST)
        
        loan.returned_date = timezone.now().date()
        loan.save() # Apenas salvamos o empréstimo. available_quantity será atualizada.
        
        return Response({"detail": "Ferramenta devolvida com sucesso."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def active_loans(self, request):
        """ Retorna todos os empréstimos que ainda não foram devolvidos. """
        active_loans = self.queryset.filter(returned_date__isnull=True)
        serializer = self.get_serializer(active_loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def overdue_loans(self, request):
        """ Retorna empréstimos ativos cuja data de devolução já passou. """
        overdue_loans = self.queryset.filter(due_date__lt=timezone.now().date(), returned_date__isnull=True)
        serializer = self.get_serializer(overdue_loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def loan_history(self, request):
        """ Retorna todos os empréstimos que já foram concluídos. """
        loan_history = self.queryset.filter(returned_date__isnull=False)
        serializer = self.get_serializer(loan_history, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class DashboardViewSet(viewsets.ViewSet):
    """
    Endpoint para fornecer dados consolidados para um painel de controle.
    """
    def list(self, request):
        total_tool_types = Tool.objects.count()
        active_loans_count = Loan.objects.filter(returned_date__isnull=True).count()
        overdue_loans_count = Loan.objects.filter(due_date__lt=timezone.now().date(), returned_date__isnull=True).count()
        
        # Agregação correta para calcular o total de ferramentas disponíveis
        total_items = Tool.objects.aggregate(total=Coalesce(Sum('total_quantity'), 0))['total']
        total_borrowed = Loan.objects.filter(returned_date__isnull=True).aggregate(total=Coalesce(Sum('quantity'), 0))['total']
        available_in_warehouse = total_items - total_borrowed

        tools_in_maintenance = Tool.objects.filter(condition="maintenance").aggregate(total=Coalesce(Sum("total_quantity"), 0))["total"]
        total_maintenance_cost = Tool.objects.aggregate(total=Coalesce(Sum("maintenance_cost"), 0.00, output_field=DecimalField()))["total"]
        
        # Agregação correta para o valor total (preço unitário * quantidade total de cada ferramenta)
        total_inventory_value = Tool.objects.annotate(
            item_value=F('total_quantity') * F('unit_value')
        ).aggregate(total=Coalesce(Sum('item_value'), 0.00, output_field=DecimalField()))['total']

        data = {
            "total_tool_types": total_tool_types,
            "active_loans_count": active_loans_count,
            "overdue_loans_count": overdue_loans_count,
            "available_in_warehouse": available_in_warehouse,
            "tools_in_maintenance": tools_in_maintenance,
            "total_maintenance_cost": f"{total_maintenance_cost:.2f}",
            "total_inventory_value": f"{total_inventory_value:.2f}",
        }
        return Response(data)


# inventory/views.py

# ... (outros imports e ViewSets) ...

@method_decorator(csrf_exempt, name='dispatch')
class ExportViewSet(viewsets.ViewSet):
    """
    Endpoint para exportar dados do sistema para arquivos CSV.
    """
    # ✅ CORREÇÃO: Adicionada permissão para proteger os dados
    permission_classes = [IsAuthenticated]

    def _get_tools_data(self):
        tools = Tool.objects.all()
        header = 'Nome,Descrição,Quantidade Total,Quantidade Disponível,Condição,Valor Unitário,Data de Aquisição,Custo de Manutenção,Última Manutenção,Próxima Manutenção,Fornecedor\n'
        rows = []
        for tool in tools:
            # Garante que valores nulos não quebrem a string
            description = tool.description or ''
            supplier = tool.supplier or ''
            rows.append(f'"{tool.name}","{description}",{tool.total_quantity},{tool.available_quantity},"{tool.get_condition_display()}",{tool.unit_value},{tool.acquisition_date or ""},{tool.maintenance_cost or ""},{tool.last_maintenance_date or ""},{tool.next_maintenance_date or ""},"{supplier}"')
        return header + '\n'.join(rows)

    def _get_active_overdue_loans_data(self):
        loans = Loan.objects.filter(returned_date__isnull=True)
        header = 'Ferramenta,Mutuário,Quantidade,Data do Empréstimo,Data de Vencimento,Status\n'
        rows = []
        for loan in loans:
            status = 'Atrasado' if loan.is_overdue() else 'Ativo'
            rows.append(f'"{loan.tool.name}","{loan.borrower.username}",{loan.quantity},{loan.borrowed_date},{loan.due_date},{status}')
        return header + '\n'.join(rows)

    def _get_loan_history_data(self):
        loans = Loan.objects.filter(returned_date__isnull=False)
        header = 'Ferramenta,Mutuário,Quantidade,Data do Empréstimo,Data de Vencimento,Data de Devolução\n'
        rows = []
        for loan in loans:
            rows.append(f'"{loan.tool.name}","{loan.borrower.username}",{loan.quantity},{loan.borrowed_date},{loan.due_date},{loan.returned_date}')
        return header + '\n'.join(rows)

    @action(detail=False, methods=['get'], url_path='tools')
    def export_tools(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="ferramentas.csv"'
        response.write(self._get_tools_data())
        return response

    @action(detail=False, methods=['get'], url_path='active-loans')
    def export_active_overdue_loans(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="emprestimos_ativos.csv"'
        response.write(self._get_active_overdue_loans_data())
        return response

    @action(detail=False, methods=['get'], url_path='loan-history')
    def export_loan_history(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="historico_emprestimos.csv"'
        response.write(self._get_loan_history_data())
        return response
    
@method_decorator(csrf_exempt, name='dispatch')
class AnalyticsViewSet(viewsets.ViewSet):
    """
    Endpoint da API para fornecer dados para os gráficos de análise.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # 1. Ferramentas por Condição (Gráfico de Pizza)
        tools_by_condition = Tool.objects.values('condition').annotate(count=Count('id')).order_by('condition')
        
        # 2. Valor Total do Inventário por Ferramenta (Gráfico de Barras)
        inventory_value = Tool.objects.annotate(
            total_value=F('total_quantity') * F('unit_value')
        ).values('name', 'total_value').order_by('-total_value')[:10] # Top 10 mais valiosas

        # 3. Custos de Manutenção por Mês (Gráfico de Linha)
        maintenance_costs = Tool.objects.filter(last_maintenance_date__isnull=False).annotate(
            month=TruncMonth('last_maintenance_date')
        ).values('month').annotate(
            total_cost=Sum('maintenance_cost')
        ).order_by('month')

        # 4. Empréstimos por Mês (Gráfico de Barras)
        loan_activity = Loan.objects.annotate(
            month=TruncMonth('borrowed_date')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Monta a resposta da API
        data = {
            'tools_by_condition': list(tools_by_condition),
            'inventory_value_by_tool': list(inventory_value),
            'maintenance_cost_over_time': [
                {'month': entry['month'].strftime('%Y-%m'), 'total_cost': entry['total_cost']} for entry in maintenance_costs
            ],
            'loan_activity': [
                {'month': entry['month'].strftime('%Y-%m'), 'count': entry['count']} for entry in loan_activity
            ],
        }
        return Response(data)