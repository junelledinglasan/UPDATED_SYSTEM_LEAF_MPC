from rest_framework import serializers
from .models import Announcement, AnnouncementComment


class CommentSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.ReadOnlyField()
    posted_by_role = serializers.ReadOnlyField()

    class Meta:
        model  = AnnouncementComment
        fields = ['id', 'body', 'posted_by_name', 'posted_by_role', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.ReadOnlyField()
    posted_by_role = serializers.ReadOnlyField()
    image_url      = serializers.ReadOnlyField()
    comments       = CommentSerializer(many=True, read_only=True)
    comment_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'type', 'image', 'image_url',
            'pinned', 'is_active', 'posted_by_name', 'posted_by_role',
            'created_at', 'updated_at', 'comments', 'comment_count',
        ]
        extra_kwargs = {
            'image': {'required': False},
        }

    def get_comment_count(self, obj):
        return obj.comments.count()