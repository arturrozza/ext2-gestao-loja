# Decisões

> Registro curto do que foi decidido e por quê, a mais recente no topo. Vale para produto (regras de negócio) e para
> decisões técnicas que não ficam óbvias lendo o código. Quando uma decisão mudar, edite a entrada e diga o que mudou.

Formato:

```md
## AAAA-MM-DD: <título curto>

**Decisão:** o que foi decidido.
**Por quê:** o motivo, e as alternativas descartadas quando ajudar.
```

## 2026-11-03: Regras de negócio entram aos poucos

**Decisão:** os docs de produto (visão, domínio, requisitos não funcionais e specs por módulo) saíram do repo. As regras
de negócio passam a vir do mantenedor, feature por feature, e cada uma que não for óbvia no código é registrada aqui.
**Por quê:** as specs vinham dos documentos de planejamento, com conflitos e lacunas em aberto. Registrar só o que foi
decidido de fato evita implementar regra que ninguém confirmou.
