from rest_framework import serializers
from .models import Tool, Loan

class ToolSerializer(serializers.ModelSerializer):
    available_quantity = serializers.ReadOnlyField()
    borrowed_quantity = serializers.ReadOnlyField()

    class Meta:
        model = Tool
        fields = ['id', 'name', 'description', 'total_quantity', 'available_for_loan', 'available_quantity', 'borrowed_quantity', 'image', 'condition', 'unit_value', 'acquisition_date', 'maintenance_cost', 'last_maintenance_date', 'next_maintenance_date', 'supplier']

class LoanSerializer(serializers.ModelSerializer):
    tool_name = serializers.CharField(source='tool.name', read_only=True)
    borrower_username = serializers.CharField(source='borrower.username', read_only=True)

    class Meta:
        model = Loan
        fields = ['id', 'tool', 'tool_name', 'borrower', 'borrower_username', 'quantity', 'borrowed_date', 'due_date', 'returned_date']
        read_only_fields = ['borrowed_date']

