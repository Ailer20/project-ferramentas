from django.db import models
from django.db.models import Sum
from django.utils import timezone

class Tool(models.Model):
    CONDITION_CHOICES = [
        ('good', 'Boa Condição'),
        ('new', 'Novo'),
        ('recovered', 'Recuperada'),
        ('maintenance', 'Em Manutenção'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    total_quantity = models.IntegerField(default=0)
    image = models.ImageField(upload_to='tool_images/', max_length=300, blank=True, null=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    unit_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    acquisition_date = models.DateField(blank=True, null=True)
    maintenance_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    last_maintenance_date = models.DateField(blank=True, null=True)
    next_maintenance_date = models.DateField(blank=True, null=True)
    supplier = models.CharField(max_length=255, blank=True, null=True)

    @property
    def borrowed_quantity(self):
        # Isto SOMA corretamente a quantidade de todos os empréstimos ativos
        result = self.loan_set.filter(returned_date__isnull=True).aggregate(total=Sum('quantity'))
        return result['total'] or 0

    @property
    def available_quantity(self):
        return self.total_quantity - self.borrowed_quantity
    class Meta:
            permissions = [
                ("dashboard", "Pode ver o Dashboard"),
                ("manage_tools", "Pode ver a página Gerenciar Ferramentas"),
                ("virtual_warehouse", "Pode ver o Armazém Virtual"),
                ("register_loan", "Pode ver a página Registrar Empréstimo"),
                ("active_loans", "Pode ver a página Empréstimos Ativos"),
                ("history", "Pode ver o Histórico de Empréstimos"),
                ("analytics", "Pode ver a página de Análise e Relatórios"),
            ]

    def __str__(self):
            return self.name

class Loan(models.Model):
    tool = models.ForeignKey(Tool, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    borrower = models.ForeignKey('users.User', on_delete=models.CASCADE)
    borrowed_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    returned_date = models.DateField(blank=True, null=True)

    def is_overdue(self):
        return self.due_date < timezone.now().date() and self.returned_date is None

    def __str__(self):
        return f"{self.quantity}x {self.tool.name} emprestado para {self.borrower.username}"
