from rest_framework import serializers
from .models import Member, MembershipApplication


class MembershipApplicationSerializer(serializers.ModelSerializer):
    fullname = serializers.ReadOnlyField()
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = MembershipApplication
        fields = '__all__'
        read_only_fields = ['app_id', 'submitted_at', 'reviewed_at', 'reviewed_by']


class MembershipApplicationListSerializer(serializers.ModelSerializer):
    fullname = serializers.ReadOnlyField()
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = MembershipApplication
        fields = [
            'id', 'app_id', 'firstname', 'lastname', 'fullname',
            'contact', 'email', 'occupation', 'birthdate',
            'status', 'submitted_at', 'username',
        ]


class MemberSerializer(serializers.ModelSerializer):
    fullname     = serializers.ReadOnlyField()
    max_loanable = serializers.ReadOnlyField()
    username     = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Member
        fields = '__all__'


class MemberListSerializer(serializers.ModelSerializer):
    fullname = serializers.ReadOnlyField()
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Member
        fields = [
            'id', 'member_id', 'firstname', 'lastname', 'fullname',
            'contact', 'email', 'status', 'share_capital',
            'date_registered', 'username',
        ]