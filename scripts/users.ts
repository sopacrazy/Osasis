import 'dotenv/config';
import { createStore } from '../store.ts';
import { hashPassword } from '../auth.ts';

/**
 * Administração de contas (rode no servidor, na pasta do app):
 *   npm run users -- list
 *   npm run users -- create <usuario> <senha>
 *   npm run users -- reset  <usuario> <nova-senha>
 *   npm run users -- delete <usuario>
 */
const [cmd, name, pass] = process.argv.slice(2);
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const store = await createStore();
console.log(`(armazenamento: ${store.kind === 'mysql' ? 'MariaDB' : 'arquivos locais'})`);

async function main() {
  switch (cmd) {
    case 'list': {
      const users = await store.users.list();
      if (users.length === 0) console.log('Nenhuma conta.');
      for (const u of users) {
        const n = await store.campaigns.count(u.id);
        console.log(`${u.username.padEnd(20)} criada em ${u.createdAt.slice(0, 10)}  campanhas: ${n}`);
      }
      return;
    }
    case 'create': {
      if (!name || !USERNAME_RE.test(name) || !pass || pass.length < 8) {
        throw new Error('Uso: create <usuario (3-20: letras, números, _)> <senha (mín. 8)>');
      }
      await store.users.create(name, await hashPassword(pass));
      console.log(`Conta "${name.toLowerCase()}" criada.`);
      return;
    }
    case 'reset': {
      const u = name ? await store.users.byName(name) : undefined;
      if (!u) throw new Error('Usuário não encontrado.');
      if (!pass || pass.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
      await store.users.setPassword(u.id, await hashPassword(pass));
      await store.sessions.removeForUser(u.id);
      console.log(`Senha de "${u.username}" redefinida; sessões antigas encerradas.`);
      return;
    }
    case 'delete': {
      const u = name ? await store.users.byName(name) : undefined;
      if (!u) throw new Error('Usuário não encontrado.');
      await store.users.remove(u.id);
      console.log(`Conta "${u.username}" e suas campanhas foram apagadas.`);
      return;
    }
    default:
      console.log('Comandos: list | create <usuario> <senha> | reset <usuario> <nova-senha> | delete <usuario>');
  }
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error('Erro:', err instanceof Error ? err.message : err);
  process.exit(1);
}
