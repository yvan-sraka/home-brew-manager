#! /usr/bin/env node

const runCmd = (cmd, verbose=true) => {
    if (verbose) console.log('\x1b[33m%s\x1b[0m', `${cmd}`)
    try {
        const output = require('child_process')
            .execSync(cmd, { encoding: 'utf-8' }).toString()
        if (verbose) console.log(output)
        return output
    } catch (error) {
        console.log(error.message)
        process.exit(1)
    }
}

const saveCfg = (cfgPath, jsonData) =>
    require('fs').writeFileSync(cfgPath, JSON.stringify(jsonData, null, 2))

const readCfg = cfgPath => {
    if (!require('fs').existsSync(cfgPath)) {
        console.log('\x1b[31m%s\x1b[0m', `Error: "${cfgPath}" not found ...`)
        console.log("You can generate it with `homebrew init` command.")
        process.exit(1)
    }
    return JSON.parse(require('fs').readFileSync(cfgPath))
}

const computeDiff = (currentCfg, wantedCfg) => {
    const pkgs = { added: new Set(wantedCfg), removed: new Set() }
    for (pkg of currentCfg) {
        if (wantedCfg.includes(pkg)) pkgs.added.delete(pkg)
        else pkgs.removed.add(pkg)
    }
    return pkgs
}

class Brew {
    static cfgPath = `${require('os').homedir()}/.homebrew.json`

    static detectCfg = () => runCmd('brew list', false)
        .split('\n').filter(x => x != '')

    static update = pkgs => {
        if (pkgs.removed.size)
            runCmd(`brew uninstall ${[...pkgs.removed].join(' ')}`)
        if (pkgs.added.size)
            runCmd(`brew install ${[...pkgs.added].join(' ')}`)
    }

    static upgrade = () => runCmd('brew update') && runCmd('brew upgrade')
}

const match = options => options.some(x => process.argv.includes(x))
if (match(['init'])) {
    console.log(`Backup current configuration into ${Brew.cfgPath}`)
    saveCfg(Brew.cfgPath, Brew.detectCfg())
} else if (match(['switch'])) {
    Brew.update(computeDiff(Brew.detectCfg(), readCfg(Brew.cfgPath)))
    if (match(['--upgrade'])) Brew.upgrade()
} else if (match(['-V', '--version'])) {
    console.log('0.1.0')
} else if (match(['-h', '--help'])) {
    console.log(`
Homebrew 0.1.0
Yvan SRAKA <yvan@sraka.xyz>
User configuration for brew package manager

USAGE:
    homebrew <COMMAND>

FLAGS:
    -h, --help       Prints help information
    -V, --version    Prints version information

COMMANDS:
    init
    switch [--upgrade]
`)} else {
    console.log('Command not found, run `homebrew --help` for usage info')
}