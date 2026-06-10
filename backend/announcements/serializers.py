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
    comments       = CommentSerializer(many=True, read_only=True)
    comment_count  = serializers.SerializerMethodField()
    image_url      = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'type', 'image', 'image_url',
            'pinned', 'is_active', 'posted_by_name', 'posted_by_role',
            'created_at', 'updated_at', 'comments', 'comment_count',
        ]
        extra_kwargs = {
            'image':     {'required': False},
            'is_active': {'required': False, 'default': True},
            'pinned':    {'required': False, 'default': False},
        }

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        from django.conf import settings
        return f"{settings.MEDIA_URL}{obj.image.name}"

    def to_internal_value(self, data):
        # Fix: FormData sends "true"/"false" as strings — convert to bool
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'pinned' in mutable:
            val = mutable['pinned']
            mutable['pinned'] = val in [True, 'true', 'True', '1', 1]
        if 'is_active' in mutable:
            val = mutable['is_active']
            mutable['is_active'] = val in [True, 'true', 'True', '1', 1]
        return super().to_internal_value(mutable)