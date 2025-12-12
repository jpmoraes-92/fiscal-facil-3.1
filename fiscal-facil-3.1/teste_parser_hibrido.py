#!/usr/bin/env python3
"""
Script de teste para validar o Parser XML Híbrido
Testa ambos os formatos: Legado (Ginfes) e SPED
"""

import sys
sys.path.insert(0, '/app/backend')

from utils.xml_parser import parse_xml_nota
import json

def testar_xml(caminho, descricao):
    print(f"\n{'='*80}")
    print(f"TESTE: {descricao}")
    print(f"Arquivo: {caminho}")
    print('='*80)
    
    try:
        with open(caminho, 'rb') as f:
            resultado = parse_xml_nota(f.read())
        
        if 'erro' in resultado:
            print(f"❌ ERRO: {resultado['erro']}")
            return False
        else:
            print("✅ SUCESSO! Dados extraídos:")
            print(json.dumps({
                'numero_nota': resultado['numero_nota'],
                'data_emissao': resultado['data_emissao'],
                'valor_total': resultado['valor_total'],
                'codigo_servico': resultado['codigo_servico'],
                'cnpj_tomador': resultado.get('cnpj_tomador'),
                'cnpj_prestador': resultado.get('cnpj_prestador'),
                'chave_validacao': resultado.get('chave_validacao', 'N/A')[:50] + '...' if resultado.get('chave_validacao') else 'N/A',
                'xml_bruto_size': f"{len(resultado.get('xml_bruto', ''))} bytes"
            }, indent=2, ensure_ascii=False))
            return True
    except Exception as e:
        print(f"❌ EXCEÇÃO: {str(e)}")
        return False

def main():
    print("\n" + "🔍 VALIDAÇÃO DO PARSER XML HÍBRIDO - FISCAL FÁCIL 3.0".center(80))
    print("="*80)
    
    testes = [
        ('/app/xml_legado.xml', 'XML Legado (Ginfes/Birigui)'),
        ('/app/xml_sped.xml', 'XML Padrão Nacional (SPED)')
    ]
    
    resultados = []
    for caminho, descricao in testes:
        resultado = testar_xml(caminho, descricao)
        resultados.append((descricao, resultado))
    
    # Resumo
    print(f"\n{'='*80}")
    print("📊 RESUMO DOS TESTES")
    print('='*80)
    
    for descricao, sucesso in resultados:
        status = "✅ PASSOU" if sucesso else "❌ FALHOU"
        print(f"{status} - {descricao}")
    
    total_sucesso = sum(1 for _, s in resultados if s)
    total_testes = len(resultados)
    
    print(f"\n🎯 Resultado Final: {total_sucesso}/{total_testes} testes passaram")
    
    if total_sucesso == total_testes:
        print("\n🎉 TODOS OS TESTES PASSARAM! Parser híbrido funcionando corretamente.")
        return 0
    else:
        print(f"\n⚠️ {total_testes - total_sucesso} teste(s) falharam.")
        return 1

if __name__ == '__main__':
    exit(main())
