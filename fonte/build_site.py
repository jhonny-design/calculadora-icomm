import re
s=open('/home/claude/calculadora-onicanal.html').read()
def rep(a,b):
    global s; assert s.count(a)==1, (s.count(a), a[:90]); s=s.replace(a,b,1)
SUPA_URL='https://zrkmzrhqbymlgqjpsqcz.supabase.co'
SUPA_KEY='sb_publishable_IHaX_LiRXXEKJOfixt-w3w_BdP_-oPe'

rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>')
rep('<meta name="claude:viewport-fit-sides" content="cover">\n','')
rep("*{box-sizing:border-box}\n.syncbar","""*{box-sizing:border-box}
.login{position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px}
.login .panel{width:min(400px,100%);padding:24px;display:flex;flex-direction:column;gap:12px}
.login h1{font-size:22px;font-weight:800;color:var(--brand)}
.login .actions .btn{flex:1;justify-content:center}
.userbox{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
details.ckl summary{cursor:pointer;font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap}
details.ckl summary.nenhuma{color:var(--warn)}
.ckbox{display:flex;flex-direction:column;gap:6px;padding:8px 0 4px;min-width:200px}
.ckbox .chk{font-size:12px;white-space:normal}
.syncbar""")
rep('<div id="msg" class="msg ok toast" hidden></div>','''<div id="msg" class="msg ok toast" hidden></div>
<div class="login" id="loginBox">
  <form class="panel" id="loginForm">
    <h1>Calculadora ICOMM</h1>
    <div class="note" id="loginInfo">Entre com o e-mail liberado pelo administrador.</div>
    <label class="f">E-mail<input type="email" id="loginEmail" autocomplete="email" required placeholder="voce@empresa.com"></label>
    <label class="f">Senha<input type="password" id="loginSenha" autocomplete="current-password" required minlength="6" placeholder="mínimo 6 caracteres"></label>
    <div class="actions"><button class="btn primary" type="submit" id="btnEntrar">Entrar</button><button class="btn" type="button" id="btnPrimeiro">Primeiro acesso</button></div>
    <div class="note">No primeiro acesso, use o seu e-mail liberado e escolha uma senha.</div>
    <div class="msg err" id="loginErro" hidden></div>
  </form>
</div>''')
rep('    <button class="btn sm" id="btnTheme" type="button">🌗 Tema</button>','''    <span class="userbox"><span id="userEmail"></span><button class="btn sm" id="btnSair" type="button">Sair</button></span>
    <button class="btn sm" id="btnTheme" type="button">🌗 Tema</button>''')
rep('''  <button role="tab" aria-selected="false" data-tab="tabelas">Tabelas de custo</button>
</nav>''','''  <button role="tab" aria-selected="false" data-tab="tabelas">Tabelas de custo</button>
  <button role="tab" aria-selected="false" data-tab="acessos" id="tabAcessos" hidden>Acessos</button>
</nav>''')
rep('<!-- ===== TABELAS ===== -->','''<!-- ===== ACESSOS ===== -->
<section id="tab-acessos" role="tabpanel" hidden>
  <div class="eyebrow">Administração</div>
  <h2 class="t">Quem pode usar a calculadora</h2>
  <p class="lead">Só e-mails desta lista conseguem entrar. Depois de liberar, marque quais contas a pessoa pode ver e avise pra clicar em "Primeiro acesso". Administradores veem todas as contas e são os únicos que veem esta aba.</p>
  <form class="panel paramgrid" id="formMembro">
    <label class="f wide">E-mail<input type="text" id="mEmail" placeholder="pessoa@empresa.com" autocomplete="off"></label>
    <label class="chk"><input type="checkbox" id="mAdmin"> Administrador (pode liberar acessos)</label>
    <div class="actions"><button class="btn primary" type="submit">Liberar acesso</button></div>
  </form>
  <div class="panel hist" style="margin-top:14px">
    <div class="tbl small"><table><thead><tr><th>E-mail</th><th>Perfil</th><th>Contas que vê</th><th>Liberado em</th><th></th></tr></thead><tbody id="membrosBody"></tbody></table></div>
  </div>
</section>

<!-- ===== TABELAS ===== -->''')
rep("['calc','massa','custos','param','tabelas'].forEach(x=>$('tab-'+x).hidden=x!==t);","['calc','massa','custos','param','tabelas','acessos'].forEach(x=>$('tab-'+x).hidden=x!==t);")
rep("  if(!downloadsNS){ return copiarTexto(","  if(!downloadsNS && !window.claude){ try{ XLSX.writeFile(wb,nomeArq); notificar('Arquivo '+nomeArq+' baixado.'); return; }catch(e){} }\n  if(!downloadsNS){ return copiarTexto(")

rep("  conectarBanco(); })();","  })();")
old_start=s.index("async function conectarBanco(){")
old_end=s.index("function oferecerMigracao(){")
novo=open('/tmp/claude-0/-home-claude/0b0c8d98-dda5-521e-ae0a-e3f3d1786ed2/scratchpad/supa_block.js').read().replace('__URL__',SUPA_URL).replace('__KEY__',SUPA_KEY)
s=s[:old_start]+novo+s[old_end:]
rep("Envie pro banco pra que todos que abrem o link vejam.","Envie pro banco pra que todos da equipe vejam.")
rep("Cópia de segurança de produtos, contas, parâmetros e histórico. Cole aqui e importe pra restaurar.","Cópia de segurança de produtos, contas, parâmetros e histórico. Pra trazer os dados da versão antiga, copie o backup lá e cole aqui.")
doc='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
i=s.index('</style>')+len('</style>')
out=doc+s[:i]+'\n</head><body>\n'+s[i:]+'\n</body></html>\n'
open('/home/claude/calculadora-icomm-site/index.html','w').write(out)
open('/tmp/claude-0/-home-claude/0b0c8d98-dda5-521e-ae0a-e3f3d1786ed2/scratchpad/chk.js','w').write(re.search(r'<script>(.*)</script>',out,re.S).group(1))
print('ok')
