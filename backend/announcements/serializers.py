from rest_framework import serializers
from .models import Announcement, AnnouncementComment


class CommentSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.name', read_only=True)
    posted_by_role = serializers.CharField(source='posted_by.role', read_only=True)

    class Meta:
        model  = AnnouncementComment
        fields = ['id', 'body', 'posted_by', 'posted_by_name', 'posted_by_role', 'created_at']
        read_only_fields = ['posted_by', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.name', read_only=True)
    posted_by_role = serializers.CharField(source='posted_by.role', read_only=True)
    comment_count  = serializers.SerializerMethodField()
    comments       = CommentSerializer(many=True, read_only=True)

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'type',
            'posted_by', 'posted_by_name', 'posted_by_role',
            'is_active', 'created_at', 'updated_at',
            'comment_count', 'comments',
        ]
        read_only_fields = ['posted_by', 'created_at', 'updated_at']

    def get_comment_count(self, obj):
        return obj.comments.count()


class AnnouncementListSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.name', read_only=True)
    posted_by_role = serializers.CharField(source='posted_by.role', read_only=True)
    comment_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'type',
            'posted_by_name', 'posted_by_role',
            'is_active', 'created_at', 'comment_count',
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()