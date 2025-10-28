# Sistema de Cálculos Dinâmicos - Documentação

## 📋 Visão Geral

Este sistema permite calcular preços de venda e margens de lucro de forma dinâmica e interativa. Qualquer campo de cálculo pode ser alterado, e todos os outros valores são recalculados automaticamente.

## 🎯 Funcionalidades Principais

### 1. Cálculos Dinâmicos e Bidirecionais

O sistema permite 5 formas diferentes de calcular preços e lucros:

#### **Método 1: Por Lucro Desejado (%)**
- **Entrada**: Percentual de lucro desejado (ex: 25%)
- **Calcula**: Preço de venda necessário para alcançar essa margem
- **Fórmula**: `PV = CustoBase / (1 - (Comissão% + Impostos% + LucroDesejado%) / 100)`
- **Uso**: Quando você sabe qual margem quer ter sobre as vendas

#### **Método 2: Por Preço de Venda (R$)**
- **Entrada**: Valor que deseja cobrar pelo produto
- **Calcula**: Todos os lucros resultantes (líquido, absoluto, margem %)
- **Uso**: Quando você já tem um preço em mente ou pesquisou preços de mercado

#### **Método 3: Por Lucro Líquido (R$)**
- **Entrada**: Valor em reais que deseja lucrar após todas as despesas
- **Calcula**: Preço de venda necessário
- **Fórmula**: `PV = (LucroLiquido + CustoBase) / (1 - (Comissão% + Impostos%) / 100)`
- **Uso**: Quando você tem uma meta de lucro específica em reais

#### **Método 4: Por Lucro Absoluto (R$)**
- **Entrada**: Margem bruta desejada (antes de impostos e comissões)
- **Calcula**: Preço de venda
- **Fórmula**: `PV = LucroAbsoluto + CustoBase`
- **Uso**: Para análise de margem bruta do produto

#### **Método 5: Por Markup (%)**
- **Entrada**: Multiplicador sobre o custo base
- **Calcula**: Preço de venda
- **Fórmula**: `PV = (Markup% / 100) * CustoBase`
- **Uso**: Método tradicional de precificação por multiplicador

## 💰 Componentes de Custo

### Custos Fixos (em R$)
- **Boleto**: R$ 4,50 (fixo)

### Custos Percentuais (sobre Preço de Venda)
- **Comissão**: 4,5%
- **Impostos**: 4%

### Custos Especiais (Produtos Importados)
- **DIFAL**: 13% sobre o custo do produto
- **Aplicado apenas quando Origem = "Importado"**

## 📊 Campos Calculados Automaticamente

### DIFAL (R$)
- Calculado apenas para produtos importados
- Fórmula: `Custo * 13% / 100`

### Comissão (R$)
- Fórmula: `PrecoVenda * 4,5% / 100`

### Impostos (R$)
- Fórmula: `PrecoVenda * 4% / 100`

### Lucro Líquido
- Fórmula: `PV - Custo - Frete - Boleto - DIFAL(R$) - Comissão(R$) - Impostos(R$)`
- **Lucro após todas as despesas**

### Lucro Absoluto
- Fórmula: `PV - (Custo + Frete + Boleto + DIFAL(R$))`
- **Margem bruta (antes de comissões e impostos)**

### Markup (%)
- Fórmula: `(PV / CustoBase) * 100`
- **Multiplicador sobre o custo base**

## 🎨 Interface Visual

### Código de Cores

- **🔵 Campos Azuis**: Editáveis - ao alterar, recalculam todos os outros
- **🟢 Campos Verdes**: Sugestões de lucro com margens fixas (20% e 30%)
- **⚪ Campos Cinzas**: Calculados automaticamente (read-only)

### Sugestões de Lucro (20% e 30%)

Campos especiais que mostram quanto você lucraria se aplicasse margens de 20% ou 30%:

- **Lucro 20**: Mostra o lucro líquido com margem de 20%
- **Lucro 30**: Mostra o lucro líquido com margem de 30%

Útil para comparar rapidamente diferentes cenários de precificação.

## 📈 Resumo do Cálculo

A seção de resumo mostra:

1. **Custo Total Base**: Soma de todos os custos iniciais
2. **Preço de Venda**: Valor final de venda
3. **Lucro Líquido**: Ganho real após todas as despesas
4. **Margem (%)**: Percentual de lucro sobre o preço de venda
5. **Markup**: Multiplicador sobre o custo
6. **Total Despesas**: Soma de DIFAL + Comissão + Impostos + Boleto

## 🔄 Como Usar

### Exemplo Prático 1: Calcular por Lucro Desejado

1. Preencha **Custo do Produto**: R$ 1.000,00
2. Preencha **Frete**: R$ 50,00
3. Selecione **Origem**: Nacional
4. Digite **Lucro Desejado**: 25%
5. ✅ Sistema calcula automaticamente:
   - Preço de Venda: R$ 1.209,20
   - Lucro Líquido: R$ 302,30
   - Lucro Absoluto: R$ 154,70
   - Markup: 115,11%

### Exemplo Prático 2: Calcular por Preço de Venda

1. Preencha **Custo do Produto**: R$ 1.000,00
2. Preencha **Frete**: R$ 50,00
3. Selecione **Origem**: Importado
4. Digite **Preço de Venda**: R$ 1.500,00
5. ✅ Sistema calcula automaticamente:
   - Lucro Desejado: 26,82%
   - Lucro Líquido: R$ 402,25
   - Lucro Absoluto: R$ 315,00
   - Markup: 126,58%

### Exemplo Prático 3: Calcular por Lucro Líquido

1. Preencha **Custo do Produto**: R$ 800,00
2. Preencha **Frete**: R$ 30,00
3. Selecione **Origem**: Nacional
4. Digite **Lucro Líquido**: R$ 300,00
5. ✅ Sistema calcula automaticamente:
   - Preço de Venda: R$ 1.239,13
   - Lucro Desejado: 24,21%
   - Lucro Absoluto: R$ 404,63
   - Markup: 148,73%

## 🧮 Fórmulas Detalhadas

### Custo Base
```
Se Nacional:
  CustoBase = Custo + Frete + Boleto

Se Importado:
  DIFAL(R$) = Custo * 13% / 100
  CustoBase = Custo + Frete + Boleto + DIFAL(R$)
```

### Preço de Venda por Lucro Desejado
```
Denominador = 1 - (Comissão% + Impostos% + LucroDesejado%) / 100
PV = CustoBase / Denominador
```

### Lucro Líquido
```
Comissão(R$) = PV * 4,5% / 100
Impostos(R$) = PV * 4% / 100
LucroLiquido = PV - Custo - Frete - Boleto - DIFAL(R$) - Comissão(R$) - Impostos(R$)
```

### Markup
```
Markup% = (PV / CustoBase) * 100
```

## 🔧 Estrutura do Código

### Interfaces TypeScript
```typescript
interface CalculoState {
  // Dados base
  custoProduto: number;
  frete: number;
  origem: "Nacional" | "Importado";
  
  // Percentuais fixos
  boleto: number;
  comissaoPerc: number;
  impostosPerc: number;
  difalPerc: number;
  
  // Campos editáveis/calculáveis
  lucroDesejado: number;
  precoVenda: number;
  lucroLiquido: number;
  lucroAbsoluto: number;
  markup: number;
  
  // Campos calculados (read-only)
  difalReais: number;
  comissaoReais: number;
  impostosReais: number;
  lucro20: number;
  lucro30: number;
}
```

### Funções Principais
1. `calcularPorLucroDesejado()` - Função 1
2. `calcularPorPrecoVenda()` - Função 2
3. `calcularPorLucroLiquido()` - Função 3
4. `calcularPorLucroAbsoluto()` - Função 4
5. `calcularPorMarkup()` - Função 5
6. `calcularSugestoes()` - Função 6 (Lucro 20 e 30)
7. `recalcularTodos()` - Função central que orquestra os cálculos

## 💡 Dicas de Uso

1. **Produtos Importados**: Lembre-se de selecionar "Importado" para incluir o DIFAL nos cálculos
2. **Comparação de Margens**: Use as sugestões de 20% e 30% para comparar rapidamente cenários
3. **Ajuste em Tempo Real**: Experimente diferentes valores em qualquer campo azul para ver o impacto
4. **Preço de Mercado**: Se conhece o preço praticado, digite-o no "Preço de Venda" para ver sua margem real
5. **Meta de Lucro**: Use "Lucro Líquido" quando tiver uma meta específica de ganho por produto

## 🎓 Conceitos Importantes

### Diferença entre Lucro Líquido e Lucro Absoluto

- **Lucro Líquido**: É o valor que realmente sobra no bolso após pagar TODAS as despesas (custo, frete, boleto, DIFAL, comissão e impostos)
- **Lucro Absoluto**: É a margem bruta antes de descontar comissões e impostos. Útil para análise de rentabilidade do produto em si

### Diferença entre Markup e Margem

- **Markup**: Multiplicador aplicado sobre o custo (ex: markup de 200% = vender por 2x o custo)
- **Margem (Lucro Desejado)**: Percentual do preço de venda que representa lucro (ex: margem de 50% = metade do preço é lucro)

### Exemplo da Diferença:
- Custo: R$ 100,00
- Markup de 200%: Preço = R$ 200,00 (lucro de R$ 100 = 50% de margem)
- Margem de 50%: Preço = R$ 200,00 (markup de 200%)

Ambos chegam ao mesmo preço, mas são conceitos diferentes!

---

## 📞 Suporte

Para dúvidas ou sugestões sobre o sistema de cálculos, consulte o código fonte em `/app/editor/page.tsx`.

