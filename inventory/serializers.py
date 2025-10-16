# inventory/serializers.py

from rest_framework import serializers
from .models import Tool, Loan

class ToolSerializer(serializers.ModelSerializer):
    """
    Serializador para o modelo Tool.
    Inclui campos calculados para quantidade disponível e emprestada.
    """
    # @property do model já calcula isso, então usamos ReadOnlyField
    available_quantity = serializers.ReadOnlyField()
    borrowed_quantity = serializers.ReadOnlyField()

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
            'unit_value',
            'acquisition_date',
            'maintenance_cost',
            'last_maintenance_date',
            'next_maintenance_date',
            'supplier'
        ]

class LoanSerializer(serializers.ModelSerializer):
    """
    Serializador para o modelo Loan.
    """
    # ADICIONADO: Campos somente leitura para expor os nomes relacionados na API.
    # Isso evita que o frontend precise fazer requisições extras.
    tool_name = serializers.ReadOnlyField(source='tool.name')
    borrower_username = serializers.ReadOnlyField(source='borrower.username')

    class Meta:
        model = Loan
        # ADICIONADO: 'tool_name' e 'borrower_username' na lista de campos.
        fields = [
            'id', 'tool', 'borrower', 'quantity', 'borrowed_date', 
            'due_date', 'returned_date', 'tool_name', 'borrower_username'
        ]
        read_only_fields = ['borrowed_date']

    def validate(self, data):
        """
        Validação customizada para garantir que a quantidade solicitada
        não exceda a quantidade disponível da ferramenta.
        """
        # Pega a ferramenta e a quantidade dos dados da requisição
        tool = data.get('tool')
        quantity = data.get('quantity')
        
        # Se for uma atualização (instance existe), precisamos considerar a quantidade já emprestada.
        current_loan_quantity = self.instance.quantity if self.instance else 0
        
        # Calcula a disponibilidade real, adicionando de volta o que já estava neste empréstimo
        effective_available = tool.available_quantity + current_loan_quantity

        if quantity > effective_available:
            raise serializers.ValidationError(
                f"Quantidade solicitada ({quantity}) maior que a disponível ({tool.available_quantity})."
            )
        return data