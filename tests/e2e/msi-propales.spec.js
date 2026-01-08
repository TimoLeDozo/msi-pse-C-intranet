// tests/e2e/msi-propales.spec.js
// Tests E2E pour MSI Propales - Version robuste
const { test, expect } = require('@playwright/test');

const CREDENTIALS = {
  username: 'admin',
  password: 'MSI_Propales'
};

// Helper pour login avec wait explicite
async function login(page) {
  await page.goto('/login');
  await page.waitForSelector('#username', { state: 'visible' });
  await page.fill('#username', CREDENTIALS.username);
  await page.fill('#password', CREDENTIALS.password);
  await page.click('button[type="submit"]');
  // Attendre que la page principale soit chargée
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForSelector('.ops-hero-title', { state: 'visible', timeout: 10000 });
}

test.describe('MSI Propales E2E', () => {
  
  test.describe('Authentication', () => {
    
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/login/);
    });

    test('login page displays correctly', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      await expect(page.locator('h1')).toContainText('Connexion');
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('login with valid credentials succeeds', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#username', { state: 'visible' });
      
      await page.fill('#username', CREDENTIALS.username);
      await page.fill('#password', CREDENTIALS.password);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page.locator('.ops-hero-title')).toBeVisible({ timeout: 10000 });
    });

    test('login with invalid credentials shows error', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('#username', { state: 'visible' });
      
      await page.fill('#username', 'admin');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Attendre que l'erreur apparaisse
      await page.waitForSelector('#error', { state: 'visible', timeout: 5000 });
      await expect(page.locator('#error')).toContainText('Identifiants invalides');
    });

  });

  test.describe('Swagger Documentation', () => {
    
    test('api-docs is accessible without authentication', async ({ page }) => {
      await page.goto('/api-docs');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/MSI Propales API/);
    });

    test('swagger shows all endpoint sections', async ({ page }) => {
      await page.goto('/api-docs');
      await page.waitForLoadState('networkidle');
      
      // Attendre que Swagger UI soit chargé
      await page.waitForSelector('.swagger-ui', { state: 'visible', timeout: 15000 });
      
      // Utiliser des sélecteurs plus spécifiques pour les sections
      await expect(page.locator('.opblock-tag-section >> text=Auth').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.opblock-tag-section >> text=Proposal').first()).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe('Console (Protected)', () => {
    
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('displays hero section after login', async ({ page }) => {
      await expect(page.locator('.ops-hero-title')).toContainText('NEURAL PROPALE');
      await expect(page.locator('.ops-btn-primary').first()).toBeVisible();
    });

    test('form panels are visible', async ({ page }) => {
      // Scroll to console section
      await page.locator('.console-section').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Petit délai pour le scroll
      
      await expect(page.locator('#f_titre')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#f_entrepriseNom')).toBeVisible({ timeout: 5000 });
    });

    test('can fill project information form', async ({ page }) => {
      await page.locator('#f_titre').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      
      await page.fill('#f_titre', 'Test E2E - Optimisation logistique');
      await page.fill('#f_thematique', 'Supply Chain');
      await page.fill('#f_codeProjet', 'E2E-001');
      
      await expect(page.locator('#f_titre')).toHaveValue('Test E2E - Optimisation logistique');
    });

    test('can fill company context form', async ({ page }) => {
      await page.locator('#f_entrepriseNom').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      
      await page.fill('#f_entrepriseNom', 'TestCorp International');
      await page.fill('#f_clientNom', 'Jean Test');
      await page.fill('#f_clientEmail', 'jean@testcorp.com');
      
      await expect(page.locator('#f_entrepriseNom')).toHaveValue('TestCorp International');
    });

    test('can fill AI brief form', async ({ page }) => {
      await page.locator('#f_ia_probleme').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      
      await page.fill('#f_ia_probleme', 'Retards de livraison chroniques');
      await page.fill('#f_ia_solution', 'Mise en place WMS et 5S');
      
      await expect(page.locator('#f_ia_probleme')).toHaveValue('Retards de livraison chroniques');
    });

    test('preview button triggers generation modal', async ({ page }) => {
      // Scroll et remplir les champs requis
      await page.locator('#f_titre').scrollIntoViewIfNeeded();
      await page.fill('#f_titre', 'Test Modal E2E');
      await page.fill('#f_entrepriseNom', 'ModalCorp E2E');
      
      await page.locator('#f_ia_probleme').scrollIntoViewIfNeeded();
      await page.fill('#f_ia_probleme', 'Test du flux de génération automatisé');
      
      // Scroll vers le bouton et cliquer
      await page.locator('#btnPreview').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.click('#btnPreview');
      
      // La modale doit apparaître
      await expect(page.locator('#generationModal')).toBeVisible({ timeout: 15000 });
    });

  });

  test.describe('API Endpoints', () => {
    
    test('auth/login returns 401 for bad credentials', async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: { username: 'bad', password: 'bad' }
      });
      expect(response.status()).toBe(401);
    });

    test('auth/login returns 200 for valid credentials', async ({ request }) => {
      const response = await request.post('/auth/login', {
        data: CREDENTIALS
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test('auth/me returns 401 without session', async ({ request }) => {
      const response = await request.get('/auth/me');
      expect(response.status()).toBe(401);
    });

  });

});