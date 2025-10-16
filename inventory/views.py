from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils.decorators import method_decorator

from .models import Tool, Loan
from .serializers import ToolSerializer, LoanSerializer

@method_decorator(csrf_exempt, name='dispatch')
class ToolViewSet(viewsets.ModelViewSet):
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer

@method_decorator(csrf_exempt, name='dispatch')
class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer

    def perform_create(self, serializer):
        tool = serializer.validated_data["tool"]
        quantity = serializer.validated_data["quantity"]
        if tool.available_for_loan < quantity:
            raise serializers.ValidationError("Not enough tools available for loan.")
        tool.available_for_loan -= quantity
        tool.save()
        serializer.save(borrower=self.request.user)

    def perform_update(self, serializer):
        old_loan = self.get_object()
        new_quantity = serializer.validated_data["quantity"]
        old_quantity = old_loan.quantity
        tool = serializer.validated_data["tool"]

        if new_quantity > old_quantity:
            diff = new_quantity - old_quantity
            if tool.available_for_loan < diff:
                raise serializers.ValidationError("Not enough tools available for loan.")
            tool.available_for_loan -= diff
        elif new_quantity < old_quantity:
            diff = old_quantity - new_quantity
            tool.available_for_loan += diff
        tool.save()
        serializer.save()

    def perform_destroy(self, instance):
        tool = instance.tool
        tool.available_for_loan += instance.quantity
        tool.save()
        instance.delete()

    @action(detail=False, methods=["get"])
    def active_loans(self, request):
        active_loans = self.queryset.filter(returned_date__isnull=True)
        serializer = self.get_serializer(active_loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def overdue_loans(self, request):
        overdue_loans = self.queryset.filter(due_date__lt=timezone.now().date(), returned_date__isnull=True)
        serializer = self.get_serializer(overdue_loans, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def return_tool(self, request, pk=None):
        loan = self.get_object()
        if loan.returned_date:
            return Response({"detail": "Esta ferramenta já foi devolvida."}, status=status.HTTP_400_BAD_REQUEST)
        loan.returned_date = timezone.now().date()
        loan.tool.available_for_loan += loan.quantity
        loan.tool.save()
        loan.save()
        return Response({"detail": "Ferramenta devolvida com sucesso."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def loan_history(self, request):
        loan_history = self.queryset.filter(returned_date__isnull=False)
        serializer = self.get_serializer(loan_history, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class DashboardViewSet(viewsets.ViewSet):
    def list(self, request):
        total_tool_types = Tool.objects.count()
        active_loans_count = Loan.objects.filter(returned_date__isnull=True).count()
        overdue_loans_count = Loan.objects.filter(due_date__lt=timezone.now().date(), returned_date__isnull=True).count()
        available_in_warehouse = Tool.objects.aggregate(Sum("available_for_loan"))["available_for_loan__sum"] or 0
        tools_in_maintenance = Tool.objects.filter(condition="maintenance").aggregate(Sum("total_quantity"))["total_quantity__sum"] or 0
        total_maintenance_cost = Tool.objects.aggregate(Sum("maintenance_cost"))["maintenance_cost__sum"] or 0.00
        total_inventory_value = Tool.objects.aggregate(Sum("unit_value"))["unit_value__sum"] or 0.00

        data = {
            "total_tool_types": total_tool_types,
            "active_loans_count": active_loans_count,
            "overdue_loans_count": overdue_loans_count,
            "available_in_warehouse": available_in_warehouse,
            "tools_in_maintenance": tools_in_maintenance,
            "total_maintenance_cost": total_maintenance_cost,
            "total_inventory_value": total_inventory_value,
        }
        return Response(data)




@method_decorator(csrf_exempt, name='dispatch')
class ExportViewSet(viewsets.ViewSet):
    def _get_tools_data(self):
        tools = Tool.objects.all()
        data = 'Nome,Descrição,Quantidade Total,Disponível para Empréstimo,Condição,Valor Unitário,Data de Aquisição,Custo de Manutenção,Última Manutenção,Próxima Manutenção,Fornecedor\n'
        for tool in tools:
            data += f'"{tool.name}","{tool.description}",{tool.total_quantity},{tool.available_for_loan},"{tool.get_condition_display()}",{tool.unit_value},{tool.acquisition_date},{tool.maintenance_cost},{tool.last_maintenance_date},{tool.next_maintenance_date},"{tool.supplier}"\n'
        return data

    def _get_active_overdue_loans_data(self):
        loans = Loan.objects.filter(returned_date__isnull=True)
        data = 'Ferramenta,Mutuário,Data do Empréstimo,Data de Vencimento,Status\n'
        for loan in loans:
            status = 'Atrasado' if loan.is_overdue() else 'Ativo'
            data += f'"{loan.tool.name}","{loan.borrower.username}",{loan.borrowed_date},{loan.due_date},{status}\n'
        return data

    def _get_loan_history_data(self):
        loans = Loan.objects.filter(returned_date__isnull=False)
        data = 'Ferramenta,Mutuário,Data do Empréstimo,Data de Vencimento,Data de Devolução\n'
        for loan in loans:
            data += f'"{loan.tool.name}","{loan.borrower.username}",{loan.borrowed_date},{loan.due_date},{loan.returned_date}\n'
        return data

    @action(detail=False, methods=['get'])
    def export_tools(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="ferramentas.csv"'
        response.write(self._get_tools_data())
        return response

    @action(detail=False, methods=['get'])
    def export_active_overdue_loans(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emprestimos_ativos_atrasados.csv"'
        response.write(self._get_active_overdue_loans_data())
        return response

    @action(detail=False, methods=['get'])
    def export_loan_history(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="historico_emprestimos.csv"'
        response.write(self._get_loan_history_data())
        return response

