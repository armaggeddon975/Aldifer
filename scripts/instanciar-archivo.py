"""Fixa o eixo de largura da Archivo em 125% e regrava o arquivo.

    python scripts/instanciar-archivo.py <origem.woff2> <destino.woff2>

Chamado por `npm run fonts`. O arquivo gerado é VERSIONADO, então quem só clona
e roda `npm install && npm run build` nunca precisa de Python.

POR QUE ISTO EXISTE

O design system pede "Archivo Expanded", que não é uma família separada: é o
eixo `wdth` da Archivo em 125%. Para pedir 125% por CSS, o arquivo precisa
CARREGAR o eixo inteiro (62% a 125%) — e é isso que custa:

    archivo-latin-standard-normal.woff2   90.104 B   wght + wdth
    archivo-latin-wght-normal.woff2       34.928 B   só wght, e sem o Expanded

Esses 55 KB ficam no caminho crítico, porque a Archivo é a fonte do H1, que é o
elemento de LCP, e por isso ela é a única com `<link rel="preload">`. Medido na
Etapa 13 em /orcamento, a página mais pesada do site, com 9 execuções do
Lighthouse:

    com o eixo de largura   LCP 2,41-2,56s   7 de 9 acima da meta de 2,50s
    sem o eixo de largura   LCP 1,96-2,11s   0 de 9 acima

Instanciar resolve os dois lados: o eixo `wdth` sai do arquivo COM O VALOR 125
JÁ APLICADO aos contornos. O desenho é o mesmo que o navegador produzia pedindo
`font-stretch: 125%`, e o arquivo fica em 34.648 B — menor até que a versão
só-peso, porque perdeu também as tabelas de variação daquele eixo.

O eixo `wght` CONTINUA variável (100 a 900). Poderia ser restringido a 600-700,
que é o que o design usa, mas manter a faixa inteira garante que nenhum peso
usado em qualquer lugar do site mude de aparência — e a economia extra seria
pequena.

`updateFontNames=False` de propósito: com `True`, o fontTools reescreve o nome
interno como "Archivo SemiBold Expanded SemiBold", que é confuso. O nome interno
não afeta a renderização, porque quem nomeia a família é o `@font-face` do CSS.
"""

import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

LARGURA_EXPANDIDA = 125


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2

    origem, destino = sys.argv[1], sys.argv[2]

    fonte = TTFont(origem)

    eixos = {eixo.axisTag: eixo for eixo in fonte["fvar"].axes}
    if "wdth" not in eixos:
        print(
            f"ERRO: {origem} não tem eixo wdth. "
            "O arquivo `standard` do @fontsource-variable/archivo tem; "
            "o `wght` não — e sem ele não há Expanded para fixar.",
            file=sys.stderr,
        )
        return 1

    wdth = eixos["wdth"]
    if not wdth.minValue <= LARGURA_EXPANDIDA <= wdth.maxValue:
        print(
            f"ERRO: wdth {LARGURA_EXPANDIDA} fora da faixa "
            f"{wdth.minValue}–{wdth.maxValue} de {origem}.",
            file=sys.stderr,
        )
        return 1

    instancer.instantiateVariableFont(
        fonte, {"wdth": LARGURA_EXPANDIDA}, inplace=True, updateFontNames=False
    )

    restantes = [eixo.axisTag for eixo in fonte["fvar"].axes] if "fvar" in fonte else []
    if "wdth" in restantes:
        print("ERRO: o eixo wdth continua no arquivo gerado.", file=sys.stderr)
        return 1
    if "wght" not in restantes:
        print(
            "ERRO: o eixo wght desapareceu. O site usa 600 e 700, "
            "e um arquivo estático num peso só quebraria os títulos.",
            file=sys.stderr,
        )
        return 1

    fonte.flavor = "woff2"
    fonte.save(destino)

    antes, depois = os.path.getsize(origem), os.path.getsize(destino)
    print(
        f"Archivo instanciada em wdth {LARGURA_EXPANDIDA}: "
        f"{antes} -> {depois} bytes (-{antes - depois}). "
        f"Eixos restantes: {', '.join(restantes)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
