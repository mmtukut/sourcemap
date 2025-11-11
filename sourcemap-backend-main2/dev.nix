{ pkgs ? import <nixpkgs> {} }:

let
  # Use Python 3.11
  python = pkgs.python311;

  # Create a Python environment that includes all packages from requirements.txt
  pythonWithPackages = python.withPackages (ps: with ps; [
    django
    djangorestframework
    psycopg2-binary
    python-dotenv
    django-cors-headers
    langchain-google-genai
    langchain-community
    pypdf
    tenacity
    sqlalchemy
    pydantic
    pydantic-settings
    python-multipart
    aiohttp
    pytest
    pytest-asyncio
    drf-spectacular
    loguru
    pillow # Added missing dependency
    pymupdf # Added missing dependency
    pyexiftool
  ]);

in
pkgs.mkShell {
  # These are the packages that will be available in your shell
  buildInputs = [
    # Make the python interpreter and its packages available
    pythonWithPackages
  ];

  # This makes the `python` command work in your terminal
  shellHook = ''
    export PYTHONPATH="${pythonWithPackages}/${python.sitePackages}:$PYTHONPATH"
  '';
}
