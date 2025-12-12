import requests

# Tenta na URL com prefixo (Correta)
url_correta = "http://127.0.0.1:8000/empresas/consulta/41589478000186"
print(f"Tentando acessar: {url_correta} ...")

try:
    response = requests.get(url_correta)
    print(f"Status Code: {response.status_code}")
    print(f"Resposta: {response.json()}")
except Exception as e:
    print(f"Erro ao conectar: {e}")