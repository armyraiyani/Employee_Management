import os
import django
from django.conf import settings
from django.urls import URLPattern, URLResolver

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

def list_urls(lis, acc=None):
    if acc is None:
        acc = []
    if not lis:
        return
    l = lis[0]
    if isinstance(l, URLPattern):
        yield acc + [str(l.pattern)]
    elif isinstance(l, URLResolver):
        yield from list_urls(l.url_patterns, acc + [str(l.pattern)])
    yield from list_urls(lis[1:], acc)

from django.urls import get_resolver

print("Scanning URLs...")
resolver = get_resolver()
for p in list_urls(resolver.url_patterns):
    print("".join(p))
