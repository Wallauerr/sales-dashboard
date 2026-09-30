# Agentes

## Git / commits

- Sempre fazer commits **granulares, por arquivo** (ou por grupo lógico de arquivos), nunca um commit gigante misturando tudo — facilita achar um commit específico depois.
- Seguir o estilo de mensagens já usado no repo (Conventional Commits: `feat(...)`, `fix(...)`, `refactor(...)`, `build(...)`, `style(...)`, `revert(...)`).
- pt-BR nas conversas com o usuário; mensagens de commit em inglês.

## TODOS (ordem de execução)

0. Voltar para a branch de dashboard-customization e ajustar o drag e resize dos cards, pensei em usar o resize do shadcn já aproveitando esse assunto, ver uma forma de conseguir deixar todos os cards em uma unica tela para facilitar a visualização na tv de 60pol em 1080p, quero o minimo possivel de scroll bar para o comercial não precisar ficar mexendo nisso e sim conseguir ver as infos todas em uma unica tela.
1. ajustar filtro de anos, hj está hardcoded 2024, 2025 e 2026, a ideia é deixar de acordo com oq tiver de info alimentada no app, se tiver de 2024, vai mostrar de 2024, isso resolve o problema de ano que vem quando começar a vir novos dados, ele já entende que precisa mostrar no filtro 2027.
2. ajustar para a janela se ajustar se empurrar ela para o topo da tela do monitor, ficar em tela cheia, se remover ele voltar para o tamanho q estava antes, jogar para os lados ele fica tela cheia até a metade da tele e etc, esse comportamente de janelas do windows, não está funcionando, apenas nos botões e ajustando manualmente o tamanho do app.
3. ajustar largura maior do app, como ele vai ser usado em uma tv 60pol mas em 1080p, vai ficar com muita borda na direita e esquerda, então preciso de uma solucao para quando o app ficar em tela cheia em um monitor grande assim, para preencher toda a tela e não ficar com bordas, isso vai ajudar a ver melhor o app quando ele estiver em tela cheia.
4. quando o app compila para win, ele não carrega o icone na title bar lá na esquerda do app, junto do texto Sulmag - metas comercial.
5. tem que ver um vendedor sem nome e foto, oq é?? caso for vendas sem vendedor, adicionar uma lógica para sempre que não tiver nome de vendedor, vai mostrar hardcoded o nome VENDAS por exemplo.
6. tem uns dados sem estado no chart de estados e no de piechart.
7. Precisa pensar melhor no calculo do faturamento, acredito que hj está somando junto pedidos aprovados S/F e talvez pedidos cancelados, precisa confirmar.
8. Adicionar fundo no gráfico de acumulado anual x meta.
9. na aba histórico não precisa mostrar os vendedores, já que não aplica nenhum filtro deles na aba.
10. colocar uma opção para desativar vendedores do filtro, por exemplo, vamos ter alguns vendedores que não estão mais trabalhando com nós, precisa de uma opção para desativar eles do filtro mas sem perder os dados de faturamento, vendas e etc, não pode perder as métricas desse vendedor, ai nesse caso dá para passar para o nome que vai ter hardcoded VENDAS que foi comentado no TODO de numero 5.
11. fazer com que o filtro permita selecionar mais de um vendedor e mais de um mês para fazer comparativos entre meses específicos e também entre vendedores.
12. Novamente sobre os pedidos aprovados s/f em alguns casos vamos ter pedidos vendido sem nfe, então ele vai se enquadrar como pedido aprovado s/f, vamos precisar pensar em um filtro ou em algum campo que vai vir do proprio SIGE informando isso para diferenciar dos pedidos que realmente são aprovados s/f que são notas de remessa por exemplo(remessa para conserto, remessa de amostra gratis, remessa para industrialização e etc, talvez até esses podem entrar no filtro de pedido não faturado, é de se pensar... e deixar o filtro de pedidos aprovados s/f para os pedidos vendidos sem nfe e voltar a considerar no faturamento total e outras métricas de venda com sucesso.), Na verdade confirmei no arquivo que vem do SIGE e os pedidos vendidos sem nfe tem o campo NF-e/NFS-e vazio e no campo de status sistema fica como Pedido Faturado e não pedido faturado s/f como comentei antes e outra coisa sobre os pedidos aprovados s/f os que tiver o campo de categoria preenchido com Remessa, são os pedidos que não se deve considerar no faturamento pq ai sim são pedidos de remessa para conserto, remessa de amostra gratis, remessa para industrialização e etc, Pensar sobre isso(caso tiver algum pedido que entra como status Pedido Aprovado Sem Faturamento e na categoria não estiver como Remessa, então ele deve ser considerado como faturamento também pq pode ser outro método de fazer pedido sem nfe.)
