# users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# Registra o seu modelo de usuário customizado para que ele apareça no Admin.
# Usar UserAdmin garante que você tenha a interface completa para gerenciar
# senhas, permissões, grupos, etc.
admin.site.register(User, UserAdmin)