/**
 * lint-staged: run linters and formatters only on staged files.
 * Pre-commit runs: tsc --noEmit (once) then these per-file commands.
 */
module.exports = {
	'*.ts': ['eslint --fix', 'prettier --write'],
}
