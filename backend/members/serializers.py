from rest_framework import serializers
from .models import Member, MembershipApplication


class MembershipApplicationSerializer(serializers.ModelSerializer):
    fullname     = serializers.ReadOnlyField()
    username     = serializers.CharField(source='user.username', read_only=True)
    is_converted = serializers.SerializerMethodField()

    class Meta:
        model  = MembershipApplication
        fields = '__all__'
        read_only_fields = ['app_id', 'submitted_at', 'reviewed_at', 'reviewed_by']

    def get_is_converted(self, obj):
        return hasattr(obj, 'converted_member')


class MembershipApplicationListSerializer(serializers.ModelSerializer):
    fullname     = serializers.ReadOnlyField()
    username     = serializers.CharField(source='user.username', read_only=True)
    is_converted = serializers.SerializerMethodField()

    class Meta:
        model  = MembershipApplication
        fields = [
            'id', 'app_id', 'firstname', 'lastname', 'fullname',
            'contact', 'email', 'occupation', 'birthdate',
            'status', 'submitted_at', 'username', 'is_converted',
        ]

    def get_is_converted(self, obj):
        return hasattr(obj, 'converted_member')


class MemberSerializer(serializers.ModelSerializer):
    fullname       = serializers.ReadOnlyField()
    max_loanable   = serializers.ReadOnlyField()
    username       = serializers.CharField(source='user.username', read_only=True)
    # ← Kailangan ito para ma-filter ng frontend ang converted na applications
    application_id = serializers.SerializerMethodField()

    class Meta:
        model  = Member
        fields = '__all__'

    def get_application_id(self, obj):
        return obj.application.id if obj.application else None


class MemberListSerializer(serializers.ModelSerializer):
    fullname       = serializers.ReadOnlyField()
    username       = serializers.CharField(source='user.username', read_only=True)
    # ← Kailangan ito para ma-filter ng frontend ang converted na applications
    application_id = serializers.SerializerMethodField()

    class Meta:
        model  = Member
        fields = [
            'id', 'member_id', 'firstname', 'lastname', 'fullname',
            'contact', 'email', 'status', 'share_capital',
            'date_registered', 'username', 'application_id',
        ]

    def get_application_id(self, obj):
        return obj.application.id if obj.application else None