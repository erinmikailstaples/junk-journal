import gscan from 'gscan';

const archive = process.argv[2];

for (const checkVersion of ['v5', 'v6']) {
    const options = { checkVersion, format: 'cli' };
    const theme = await (archive ? gscan.checkZip(archive, options) : gscan.check('.', options));
    const { results } = gscan.format(theme, options);
    console.log(`Ghost ${checkVersion.slice(1)}: ${results.error.length} errors, ${results.warning.length} warnings`);
    for (const level of ['error', 'warning', 'recommendation']) {
        for (const issue of results[level]) {
            console.log(`${level.toUpperCase()}: ${issue.rule}\n${issue.details}`);
            for (const failure of issue.failures || []) {
                console.log(`${failure.ref}${failure.message ? `: ${failure.message}` : ''}`);
            }
        }
    }
    if (results.error.length) process.exitCode = 1;
}
