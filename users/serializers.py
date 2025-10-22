# users/serializers.py

from rest_framework import serializers
from .models import User
from django.contrib.auth.models import Permission

class UserSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "password")
        extra_kwargs = {
            "password": {"write_only": True}
        }


class UserDetailSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        # ✅ CORREÇÃO 1: Adicionado 'is_superuser' à lista de campos
        fields = ['id', 'username', 'email', 'is_superuser', 'permissions']

    def get_permissions(self, obj):
        # Se for superusuário, o frontend já lida com isso.
        if obj.is_superuser:
            return [] 

        # ✅ CORREÇÃO 2: Lógica robusta para buscar todas as permissões
        # Este método busca permissões do usuário E dos seus grupos.
        return list(obj.get_all_permissions())