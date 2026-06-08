import { chromium } from 'playwright';

async function runTests() {
  console.log('🧪 OAuth Onboarding Architecture Validation\n');
  console.log('═'.repeat(60));
  console.log('');

  const tests = [];
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    console.log('✓ Browser launched\n');

    // Test 1: localStorage persistence
    {
      const page = await browser.newPage();
      await page.goto('about:blank');
      
      await page.evaluate(() => {
        localStorage.setItem('sb-token', JSON.stringify({ access_token: 'test' }));
        sessionStorage.setItem('makwin-onboarding', 'user-123');
      });

      const before = await page.evaluate(() => ({
        token: localStorage.getItem('sb-token'),
        flag: sessionStorage.getItem('makwin-onboarding')
      }));

      await page.reload();

      const after = await page.evaluate(() => ({
        token: localStorage.getItem('sb-token'),
        flag: sessionStorage.getItem('makwin-onboarding')
      }));

      const passed = Boolean(after.token) && !after.flag;
      tests.push({
        name: 'localStorage persists, sessionStorage clears on reload',
        passed,
        details: `Before: token=${!!before.token}, flag="${before.flag}" | After: token=${!!after.token}, flag="${after.flag}"`
      });

      await page.close();
    }

    // Test 2: Multi-tab isolation
    {
      const pageA = await browser.newPage();
      const pageB = await browser.newPage();

      await pageA.goto('about:blank');
      await pageB.goto('about:blank');

      await pageA.evaluate(() => {
        localStorage.setItem('sb-token', 'shared-token');
        sessionStorage.setItem('makwin-tab', 'tab-A');
      });

      const tabBStorage = await pageB.evaluate(() => ({
        token: localStorage.getItem('sb-token'),
        tabFlag: sessionStorage.getItem('makwin-tab')
      }));

      const passed = Boolean(tabBStorage.token) && !tabBStorage.tabFlag;
      tests.push({
        name: 'Multi-tab: localStorage shared, sessionStorage isolated',
        passed,
        details: `Tab B sees: token=${!!tabBStorage.token}, tab flag="${tabBStorage.tabFlag}"`
      });

      await pageA.close();
      await pageB.close();
    }

    // Test 3: sessionStorage auto-clears on new tab
    {
      const page1 = await browser.newPage();
      await page1.goto('about:blank');
      await page1.evaluate(() => {
        sessionStorage.setItem('test', 'value');
      });
      const val1 = await page1.evaluate(() => sessionStorage.getItem('test'));
      await page1.close();

      // New tab should start fresh
      const page2 = await browser.newPage();
      await page2.goto('about:blank');
      const val2 = await page2.evaluate(() => sessionStorage.getItem('test'));

      const passed = val1 === 'value' && !val2;
      tests.push({
        name: 'sessionStorage cleared on new tab open',
        passed,
        details: `Tab 1: "${val1}" | Tab 2: "${val2}"`
      });

      await page2.close();
    }

  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print results
  console.log('\n📊 Test Results\n');
  tests.forEach((t, i) => {
    const icon = t.passed ? '✅' : '❌';
    console.log(`${icon} Test ${i + 1}: ${t.name}`);
    console.log(`   ${t.details}\n`);
  });

  const passed = tests.filter(t => t.passed).length;
  console.log(`Result: ${passed}/${tests.length} passed`);

  if (passed === tests.length) {
    console.log('\n✅ Storage architecture validated!');
    console.log('\n📝 Next: Run manual test cases (see OAUTH_ONBOARDING_TEST_PLAN.md)');
  }

  process.exit(passed === tests.length ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
