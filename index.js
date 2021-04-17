#! /usr/bin/env node

const runCmd = (cmd, verbose=true) => {
    if (verbose) console.log('\x1b[33m%s\x1b[0m', cmd)
    return require('child_process').execSync(cmd, { encoding: 'utf-8' })
}

const saveCfg = (cfgPath, jsonData) =>
    require('fs').writeFileSync(cfgPath, JSON.stringify(jsonData, null, 2))

const readCfg = cfgPath => {
    if (!require('fs').existsSync(cfgPath)) {
        console.log('\x1b[31m%s\x1b[0m', `ERROR: "${cfgPath}" not found ...`)
        console.log("You can generate it with `homebrew init` command.")
        process.exit(1)
    }
    return JSON.parse(require('fs').readFileSync(cfgPath))
}

const computeDiff = (currentPkgs, wantedPkgs) => {
    const [addedPkgs, removedPkgs] = [wantedPkgs, {}]
    for (const [pkg, currentHash] of Object.entries(currentPkgs)) {
        if (pkg in wantedPkgs) {
            const wantedHash = wantedPkgs[pkg]
            if (currentHash != wantedHash)
                [removedPkgs[pkg], addedPkgs[pkg]] = [currentHash, wantedHash]
            else delete addedPkgs[pkg]
        } else removedPkgs[pkg] = currentHash
    }
    return { addedPkgs, removedPkgs }
}

class Brew {
    static cfgPath = `${require('os').homedir()}/.homebrew.json`

    static detectCfg = () => Brew.pkgList()

    static pkgList = (opts="") => Object.assign({}, ...runCmd(`brew list ${opts}`, false)
        .split('\n').filter(x => x != '').map(x => x.split(' '))
        .map(x => ({ package: x[0].split('@')[0], version: x[1] }))
        .map(x => ({ [x.package]: x.version })))

    static update = ({ addedPkgs, removedPkgs }) => {
        const removedPkgsList = Object.entries(removedPkgs)
        if (removedPkgsList.length)
            runCmd(`brew uninstall --ignore-dependencies ${removedPkgsList.map(x => x[0]).join(" ")}`)
        const addedPkgsList = Object.entries(addedPkgs)
        if (addedPkgsList.length)
            runCmd(`brew install ${addedPkgsList.map(x => x.join("@")).join(" ")}`)
    }

    static upgrade = () => runCmd('brew update') && runCmd('brew upgrade')

    static lock = () => saveCfg(Brew.cfgPath, Brew.detectCfg())
}

// curl https://api.github.com/repos/izuzak/pmrpc/git/refs/heads/master
// curl https://api.github.com/repos/Homebrew/homebrew-cask/git/refs/heads/Casks/thunderbird.rb


class Cask extends Brew {
    static cfgPath = `${require('os').homedir()}/.homebrew-cask.json`
    
    static detectCfg = () => Brew.pkgList()
    
    static pkgList = (opts="") => Brew.pkgList(`--cask ${opts}`)

    static pkgsInfo = pkgs => runCmd(`brew info ${pkgs.join(' ')}`, false).split('\n')
        .filter(x => x.startsWith('From: https://github.com/')).map(x => x.slice('From: '.length))
    .map(x => x.replace('//github.com', '//raw.githubusercontent.com').replace('/blob/', '/'))

    static update = ({ addedPkgs, removedPkgs }) => {
        const removedPkgsList = Object.entries(removedPkgs)
        if (removedPkgsList.length)
            runCmd(`brew uninstall ${removedPkgsList.map(x => x[0]).join(" ")}`)
        const addedPkgsList = Object.entries(addedPkgs)
        for (pkg in addedPkgsList) {
            runCmd(`brew install --cask https://raw.githubusercontent.com/Homebrew/homebrew-cask/${git-hash}/Casks/${cask-ruby-file}.rb`)
        }
    }

    static upgrade = () => runCmd('brew update --cask') && runCmd('brew upgrade --cask')

    static lock = () => saveCfg(Brew.cfgPath, Brew.detectCfg())
}

const PkgManager = process.argv.includes('--cask') ? Cask : Brew

if (process.argv.includes('init')) {
    console.log(`Initialize current homebrew setup into ${PkgManager.cfgPath} config file`)
    PkgManager.lock()
} else if (process.argv.includes('switch')) {
    const [currentCfg, wantedCfg] = [PkgManager.detectCfg(), readCfg(PkgManager.cfgPath)]
    PkgManager.update(computeDiff(currentCfg, wantedCfg))
    if (process.argv.includes('--upgrade'))
        PkgManager.upgrade()
    PkgManager.lock()
} else if (process.argv.includes('version')) {
    console.log('0.1.0')
} else if (process.argv.includes('help')) {
    console.log(`
Homebrew 0.1.0
Yvan SRAKA <yvan@sraka.xyz>
Simple aliases collection for YeAST

USAGE:
    homebrew <COMMAND>

FLAGS:
    -h, --help       Prints help information
    -V, --version    Prints version information

COMMANDS:
    init             ...
    switch           Update aliases collection contained in folder
`)}