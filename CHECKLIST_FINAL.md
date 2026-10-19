# Checklist final da refatoração - MExplica

## Testes automatizados

- [ ] `npm.cmd test` finaliza sem falhas
- [ ] Total esperado atualmente: 33 testes
- [ ] Nenhum teste está skipped/cancelled inesperadamente

## Execução local

- [ ] `npm.cmd run dev` inicia normalmente
- [ ] Home abre
- [ ] Cadastro abre
- [ ] Comunidade abre
- [ ] Perfil abre
- [ ] Tutorial abre
- [ ] Editor abre

## Home

- [ ] Busca automática funciona
- [ ] Busca com Enter funciona
- [ ] Filtros funcionam
- [ ] Busca sem resultados funciona
- [ ] Cards abrem tutorial
- [ ] Compartilhamento funciona

## Autenticação

- [ ] Verificação de identificador funciona
- [ ] Login funciona
- [ ] Cadastro mantém os passos corretos
- [ ] Fluxo de colaborador funciona

## Perfil

- [ ] Informações carregam
- [ ] Estatísticas carregam
- [ ] Filtros dos posts funcionam
- [ ] Compartilhamento funciona
- [ ] Modal de edição abre
- [ ] Ações da conta funcionam

## Tutorial

- [ ] Conteúdo carrega
- [ ] Autor e categoria carregam
- [ ] Avaliações carregam
- [ ] Comentários carregam
- [ ] Ações de comentário/avaliação funcionam

## Editor

- [ ] Editor abre
- [ ] Campos existentes carregam na edição
- [ ] Validações funcionam
- [ ] Salvamento funciona

## Acessibilidade / UI global

- [ ] Tema funciona
- [ ] Tamanho da fonte funciona
- [ ] Conforto ocular funciona
- [ ] Menus de acessibilidade funcionam
- [ ] Menu mobile funciona
- [ ] Layout responsivo não sofreu regressão

## Console / Network

- [ ] Sem `Uncaught ReferenceError`
- [ ] Sem `Uncaught SyntaxError`
- [ ] Sem 404 para `/js/...`
- [ ] Sem 404 para `/css/...`
- [ ] Sem 404 inesperado para imagens/ícones

## CSS

- [ ] `style.css` carrega todos os módulos
- [ ] Home preservada visualmente
- [ ] Cadastro preservado visualmente
- [ ] Comunidade preservada visualmente
- [ ] Perfil preservado visualmente
- [ ] Tutorial preservado visualmente
- [ ] Editor preservado visualmente

## Git / branch

- [ ] Todas as mudanças relevantes estão commitadas
- [ ] Working tree sem alterações inesperadas
- [ ] Branch `refactor/arquitetura-organizacao` publicada no remoto
- [ ] Nenhuma alteração acidental diretamente na `main`

## Vercel Preview

- [ ] Preview da branch foi gerado
- [ ] Preview abre sem erro
- [ ] Home funciona no Preview
- [ ] Cadastro funciona no Preview
- [ ] Comunidade funciona no Preview
- [ ] Perfil funciona no Preview
- [ ] Tutorial funciona no Preview
- [ ] Editor funciona no Preview
- [ ] Arquivos estáticos carregam no Preview
- [ ] Console sem erros específicos do ambiente da Vercel

## Documentação

- [ ] `docs/ARQUITETURA.md` adicionado
- [ ] `AGENTS.md` adicionado
- [ ] README continua coerente com a estrutura atual

## Merge

- [ ] Revisar diff da branch contra `main`
- [ ] Confirmar testes verdes uma última vez
- [ ] Fazer merge somente após Preview aprovado
- [ ] Validar deploy de produção após merge
