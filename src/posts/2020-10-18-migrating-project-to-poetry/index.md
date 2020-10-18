---
date: 2020-10-18
author: browniebroke
title: 'Migrating a project to Poetry'
description: 'How I migrated a Python project to Poetry.'
header_image: header.png
tags:
  - python
  - poetry
  - packaging
  - deezer
---

[Poetry] is a tool aiming at solving the problem of Python packaging. It was started back in February 2018 by Sébastien Eustace (also the author of [pendulum]). It has a beautiful website and a ambitious headline:

> Python packaging and dependency management made easy

It has been on my radar for a while, but I never gave it a proper go. I was happily using [pip-tools], which was solving my main use case, while being a lot more lightweight and meant I could keep working with pip since its output is a good old `requirements.txt`. Poetry came up a few times, often next to [Pipenv], but recently it looks like Poetry got a bit more traction.

Having a bit of time on my hands, a few weeks ago I decided to take a proper look at it and maybe migrate one of my projects, [Deezer Python].

## Starting point

Before I started, here is how the package was managed:

- Project metadata were in `setup.cfg`, using [setuptools declarative config][setup-cfg].
- Development (and documentation) dependencies managed by [pip-tools].
- Documentation hosted on read the docs.
- Releases automated with [Python Semantic Release][psr] on Github Actions.
- Development tools configured in `setup.cfg` (black, isort, pyupgrade, flake8).
- Using `tox` to help local testing.
- Using Github Actions for CI.

These are a couple of features that were affected by migrating to Poetry, and I think it's worth mentioning them for context. Since Poetry uses `pyproject.toml`, I was also aiming at moving all my config from `setup.cfg` to that file.

## Migration

### Installing Poetry

The first step is to get the CLI. I initially installed it via Homebrew, but later realised that Poetry was setting some default values based on the Python version its installation uses. As the Homebrew Python can be updated without notice, I realised it was not the best option here, so I later reinstalled it via `pipx` using a Python installation managed by pyenv that wouldn't be wiped without my knowledge:

```sh
pipx install \
 --python ~/.pyenv/versions/3.8.6/bin/python \
 poetry
```

### Project metadata

The first step was to migrate the project metadata from `setup.cfg` to `pyproject.toml`. Poetry comes with a handy interactive command `poetry init` which will create a minimal `pyproject.toml` for you. I already noticed a few pleasant surprises:

- The CLI was very nice to interact with
- The `author` and `author_email` from `setup.cfg` were merge into an array of `authors`, each with the format `Full Name <email@address.com>`.

I then went on to translate more settings into the new format manually, and the translation was quite painless, many keys have the same name and values, and when they are different, it's mainly to simplify things. I guess it's something like setuptools cannot easily afford to do due to backwards compatibility, but that a new opt-in tool like Poetry can.

### Dependencies

Adding development dependencies was pretty simple, I just needed to run `poetry add -D ...` with the list of packages at the end.

### Extra Dependencies

This package had an "extra require" dependency which didn't work immediately as documented. By adding it on the CLI, it created this section in my `pyproject.toml`:

```toml
[tool.poetry.dependencies]
...
tornado = {version = "^6.0.4", optional = true, extras = ["tornado"]}
```

But that caused an error saying that the extra couldn't be found and [the example in the documentation][extras-ex] on this looked different. I needed to add another section below:

```toml
[tool.poetry.extras]
tornado = ["tornado"]
```

I'm not totally sure why the CLI produced incomplete config and it feels a bit odd to have to repeat the `extras` array with the dependency only to specify a section with the reverse mapping later. From what I gathered, it might be simplified in a later release, but for now it works as is.

### Docs dependencies

The dependencies to build the docs were specified in a `requirements.txt` in the `docs/` folder and RTD was configured to pick this up. I initially thought that I wouldn't be able to remove that file, but it turns out [it's possible to make it work][rtd-poetry-issue].

Thanks to [PEP 517][pep-517], which [Poetry is compliant with][poetry-pep-517], you can do `pip install .` in a Poetry package. This has been in pip since 19.0, and pip running on RTD is newer than this. However, this method wouldn't install your development dependencies, so your docs dependencies cannot be specified as such. It works if you specify a `docs` extra, though:

```toml
# pyproject.toml
[tool.poetry.dependencies]
...
myst-parser = {version = "^0.12", optional = true, extras = ["docs"]}
sphinx = {version = "^3", optional = true, extras = ["docs"]}
sphinx-autobuild = {version = "^2020.9.1", optional = true, extras = ["docs"]}
sphinx-rtd-theme = {version = "^0.5", optional = true, extras = ["docs"]}

[tool.poetry.extras]
...
docs = ["myst-parser", "sphinx", "sphinx-autobuild", "sphinx-rtd-theme"]
```

```yaml
# readthedocs.yml
version: 2
python:
  install:
    - method: pip
      path: .
      extra_requirements:
        - docs
```

The downside of this, is that the extra is part of your package, so not ideal.

## Releases

I recently moved the automation of releases to [Python Semantic Release][psr] which worked well for me, and this would have been a blocker if it wouldn't work. These are the pieces I needed:

- Move its config to come from `pyproject.toml`.
- Package version is specified in `pyproject.toml` as well as in `__init__.py`.
- Update build command to use Poetry instead of setuptools.

Here is the PSR config in `pyproject.toml` to achieve that:

```toml
[tool.semantic_release]
version_variable = [
    "deezer/__init__.py:__version__",
    "pyproject.toml:version"
]
build_command = "pip install poetry && poetry build"
```

I was expecting to have to change more, but it all worked out of the box with just that.

## Linting and code formatting

All the tools I use for linting and code formatting were configured via `setup.cfg` and ideally I'd like to replace it by `pyproject.toml`. It was possible for almost everything, except for flake8 which has [an open issue][flake8-issue] for it.

I decided to move as much things as I could to `pyproject.toml`, and move flake8 config to `.flake8`.

With all the above, I was able to remove the `setup.cfg` as well as all the Pip Tools files for dependencies.

## Tox

Poetry works nicely with Tox, I followed the [section in their FAQ][tox-poetry], and here is a overview of the changes:

```conf{2,6,8-9}
[tox]
isolated_build = true
envlist = py36,py37,py38,py39,pypy3,docs,lint,bandit

[testenv]
whitelist_externals = poetry
commands =
    poetry install
    poetry run pytest
...
```

I replaced the `deps` section in each `testenv` by a `poetry install` into the list of commands to run, and prefixed all commands to be run in the isolated environment by `poetry run`.

## Github Actions

Poetry isn't installed out of the box on Github Actions, one could either install it with a simple `run` step or use [a dedicated action][actions-poetry] for it. I've opted for the dedicated action, thinking that Dependabot could keep it up to date for me.

The rest of the changes are pretty simple, it's a matter or replacing `pip install` by `poetry install -E ...` and prefixing all commands by `poetry run`. My docs were tested and I was changing directory with `cd`, I took this opportunity to instead use `working-directory` key to the Github action step.

## Verdict

Did Poetry deliver on its ambitious tagline? I think so, I was really impressed by the developer experience of Poetry, its CLI is really nice, and I hit little issues on the way. Overall the migration was not too difficult, you can check the [pull request] on Github. I'm going to wait a bit to see how this works with updates and I might migrate other of my projects soon.

[poetry]: https://python-poetry.org/
[pendulum]: https://pendulum.eustace.io/
[pipenv]: https://pipenv.pypa.io
[pip-tools]: https://github.com/jazzband/pip-tools
[deezer python]: https://deezer-python.readthedocs.io
[setup-cfg]: https://setuptools.readthedocs.io/en/latest/setuptools.html#setup-cfg-only-projects
[psr]: https://python-semantic-release.readthedocs.io
[extras-ex]: https://python-poetry.org/docs/pyproject/#extras
[rtd-poetry-issue]: https://github.com/readthedocs/readthedocs.org/issues/4912
[pep-517]: https://www.python.org/dev/peps/pep-0517/
[poetry-pep-517]: https://python-poetry.org/docs/pyproject/#poetry-and-pep-517
[flake8-issue]: https://gitlab.com/pycqa/flake8/-/issues/428
[tox-poetry]: https://python-poetry.org/docs/faq/#is-tox-supported
[actions-poetry]: https://github.com/abatilo/actions-poetry
[pull request]: https://github.com/browniebroke/deezer-python/pull/196