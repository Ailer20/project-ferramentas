# users/serializers.py

from rest_framework import serializers
from .models import User

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
        fields = ['id', 'username', 'email', 'is_superuser', 'permissions']

    # ✅ CORREÇÃO APLICADA AQUI ✅
    # Esta nova versão da função garante que as permissões dos grupos sejam incluídas.
    def get_permissions(self, obj):
        if obj.is_superuser:
            # Para superusuários, não precisamos listar tudo, o frontend já sabe o que fazer.
            return [] 

        # Junta as permissões diretas do usuário com as permissões de todos os grupos a que ele pertence.
        # O 'distinct()' garante que não haja permissões duplicadas.
        permissions = set(
            p for g in obj.groups.all() for p in g.permissions.all().values_list('codename', flat=True)
        )
        user_permissions = set(
            p.codename for p in obj.user_permissions.all()
        )
        
        # O formato da permissão no Django é 'app_label.codename'
        # Precisamos recriar esse formato.
        from django.contrib.auth.models import Permission
        
        all_perms = set()
        
        # Permissões do usuário
        for p in obj.user_permissions.all():
            all_perms.add(f"{p.content_type.app_label}.{p.codename}")
            
        # Permissões dos grupos
        group_perms = Permission.objects.filter(group__user=obj)
        for p in group_perms:
            all_perms.add(f"{p.content_type.app_label}.{p.codename}")

        return list(all_perms)