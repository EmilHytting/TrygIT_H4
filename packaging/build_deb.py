import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGING = ROOT / "packaging" / "linux"
ARCHITECTURE = subprocess.check_output(
    ["dpkg", "--print-architecture"], text=True
).strip()
OUTPUT = ROOT / "dist" / f"trygit-simon_0.1.0_{ARCHITECTURE}.deb"


def copy_file(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="trygit-package-") as temporary:
        package = Path(temporary)
        package.chmod(0o755)
        app = package / "usr" / "lib" / "trygit"
        shutil.copytree(ROOT / "dist" / "linux" / "Simon", app, symlinks=True)
        control = package / "DEBIAN" / "control"
        control.parent.mkdir(parents=True, exist_ok=True)
        control.write_text(
            (PACKAGING / "control")
            .read_text(encoding="utf-8")
            .replace("@ARCH@", ARCHITECTURE),
            encoding="utf-8",
        )
        copy_file(PACKAGING / "trygit-simon", package / "usr" / "bin" / "trygit-simon")
        (package / "usr" / "bin" / "trygit-simon").chmod(0o755)
        copy_file(
            PACKAGING / "trygit-simon.desktop",
            package / "usr" / "share" / "applications" / "trygit-simon.desktop",
        )
        copy_file(
            ROOT / "src" / "assets" / "Simon.png",
            package / "usr" / "share" / "pixmaps" / "trygit-simon.png",
        )
        for path in package.rglob("*"):
            if not path.is_symlink():
                path.chmod(
                    0o755 if path.is_dir() or path.stat().st_mode & 0o111 else 0o644
                )
        subprocess.run(
            ["dpkg-deb", "--build", "--root-owner-group", str(package), str(OUTPUT)],
            check=True,
        )
    print(f"Pakken er klar: {OUTPUT}")


if __name__ == "__main__":
    build()
