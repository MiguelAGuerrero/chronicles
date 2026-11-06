// The e2e's one check (TG25), apart from the harness so a unit test can load it without Playwright.
//
//   check(ok, 'XX3: what it proves (values)')     prints `ok - ...`, or throws `FAILED: ...`
//   check.todo(ok, 'XX3: what it will prove')     test-first: prints `ok` or `not ok` marked `# TODO`, never fails
//
// E2E_SOFT=1 reports a failed check (`not ok - ...`) and goes on, to see every check fail on code
// from before a fix. A todo check is not a test: the spec report counts its id as untested (TG23).

function check(ok, what) {
  if (!ok && process.env.E2E_SOFT) {
    console.log(`not ok - ${what}`);
    return;
  }
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`ok - ${what}`);
}

check.todo = (ok, what) => {
  console.log(`${ok ? 'ok' : 'not ok'} - ${what} # TODO`);
};

module.exports = { check };
