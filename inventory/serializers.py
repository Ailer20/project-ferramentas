# inventory/serializers.py

from rest_framework import serializers
from .models import Tool, Loan, Employee

class ToolSerializer(serializers.ModelSerializer):
    """
    Serializador para o modelo Tool.
    Inclui campos calculados para quantidade disponível e emprestada.
    """
    # @property do model já calcula isso, então usamos ReadOnlyField
    available_quantity = serializers.ReadOnlyField()
    borrowed_quantity = serializers.ReadOnlyField()
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    class Meta:
        model = Tool
        fields = [
            'id',
            'name',
            'description',
            'total_quantity',
            'available_quantity', # <-- Campo calculado
            'borrowed_quantity',  # <-- Campo calculado
            'image',
            'condition',
            'condition_display',
            'unit_value',
            'acquisition_date',
            'maintenance_cost',
            'last_maintenance_date',
            'next_maintenance_date',
            'supplier'
        ]

# NOVO SERIALIZER
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'registration_number']

class LoanSerializer(serializers.ModelSerializer):
    """
    Serializador para o modelo Loan.
    """
    # ADICIONADO: Campos somente leitura para expor os nomes relacionados na API.
    # Isso evita que o frontend precise fazer requisições extras.
    tool_name = serializers.ReadOnlyField(source='tool.name')
    employee_name = serializers.ReadOnlyField(source='employee.name')
    employee_registration = serializers.ReadOnlyField(source='employee.registration_number')

    class Meta:
        model = Loan
        # ALTERADO: campos de borrower para employee
        fields = [
            'id', 'tool', 'employee', 'quantity', 'borrowed_date', 
            'due_date', 'returned_date', 'tool_name', 'employee_name', 'employee_registration'
        ]
        read_only_fields = ['borrowed_date']

    def validate(self, data):
            # Pega a condição do dado que está chegando. Se não estiver lá, pega do objeto existente (em caso de edição)
            condition = data.get('condition', self.instance.condition if self.instance else None)

            if condition == 'maintenance':
                maintenance_cost = data.get('maintenance_cost', self.instance.maintenance_cost if self.instance else None)
                
                # 1. VALIDAÇÃO: Custo de manutenção é obrigatório e positivo
                if not maintenance_cost or float(maintenance_cost) <= 0:
                    raise serializers.ValidationError(
                        {"maintenance_cost": "Valor da manutenção é obrigatório e deve ser positivo se a condição for 'Em Manutenção'."}
                    )
                
                # 2. LÓGICA DE NEGÓCIO: Zera a quantidade total
                # Ao salvar, a quantidade será 0, e a 'available_quantity' será recalculada automaticamente
                data['total_quantity'] = 0

                # 3. REGISTRO PARA GRÁFICO: Garante que a data da manutenção seja registrada
                # Se a data não for enviada, usamos a data de hoje
                if 'last_maintenance_date' not in data or not data['last_maintenance_date']:
                    from django.utils import timezone
                    data['last_maintenance_date'] = timezone.now().date()
            
            return data