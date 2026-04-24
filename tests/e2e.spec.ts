import { test, expect } from '@playwright/test';

test.describe('SpotMe SaaS Dashboard E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Acessa o dashboard
    await page.goto('http://localhost:3000/dashboard');
  });

  test('Deve alternar para Modo Noturno e verificar visibilidade dos botões', async ({ page }) => {
    // 1. Ir para Configurações
    await page.click('text=Configurações');
    await expect(page).toHaveURL(/.*configuracoes/);

    // 2. Clicar em Alternar Tema
    const themeBtn = page.locator('button:has-text("Alternar Tema")');
    await themeBtn.click();

    // 3. Verificar se o atributo data-theme mudou para dark
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // 4. Navegar para Gerar Lista de Convidados
    await page.click('text=Gerar Lista');
    await expect(page).toHaveURL(/.*convidados\/gerar-lista/);

    // 5. Verificar visibilidade dos botões críticos no Modo Noturno
    // Importar Excel
    const importBtn = page.locator('button:has-text("Importar Excel")');
    await expect(importBtn).toBeVisible();
    
    // WhatsApp (Verde escuro no dark mode)
    const whatsappBtn = page.locator('button:has-text("WhatsApp")');
    await expect(whatsappBtn).toBeVisible();

    // Exportar (Esmeralda no dark mode)
    const exportBtn = page.locator('button:has-text("Exportar")');
    await expect(exportBtn).toBeVisible();

    // 6. Verificar contraste (simulação visual via screenshot se necessário)
    // await page.screenshot({ path: 'test-results/dark-mode-convidados.png' });
  });

  test('Deve funcionar o fluxo de Esqueci Minha Senha', async ({ page }) => {
    await page.goto('http://localhost:3000/esqueci-senha');
    
    // Passo 1: Email
    await page.fill('input[type="email"]', 'teste@teatro.com');
    await page.click('button:has-text("Enviar Código")');

    // Passo 2: Código
    await expect(page.locator('text=Código Recebido')).toBeVisible();
    await page.fill('input[placeholder="000000"]', '123456');
    await page.click('button:has-text("Validar Código")');

    // Passo 3: Nova Senha
    await expect(page.locator('text=Nova Senha')).toBeVisible();
    await page.fill('input[placeholder="Mínimo 6 caracteres"]', 'nova-senha-123');
    await page.fill('input[placeholder="Repita a senha"]', 'nova-senha-123');
    
    // O botão final deve estar ativo
    const saveBtn = page.locator('button:has-text("Salvar Nova Senha")');
    await expect(saveBtn).toBeEnabled();
  });

  test('Interatividade do Título SpotMe (TextPressure)', async ({ page }) => {
    const logo = page.locator('text=SpotMe');
    await expect(logo).toBeVisible();
    
    // Hover para testar a animação (apenas se houver verificação de estilo dinâmica)
    await logo.hover();
  });

});
