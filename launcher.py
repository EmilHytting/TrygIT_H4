import os
import platform
import threading
from pathlib import Path

import webview

from backend import server


def data_directory():
    if os.environ.get("TRYGIT_DATA_DIR"):
        return Path(os.environ["TRYGIT_DATA_DIR"])
    if platform.system() == "Windows":
        return (
            Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
            / "TrygIT"
        )
    return (
        Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
        / "trygit"
    )


def main():
    data_path = data_directory()
    data_path.mkdir(parents=True, exist_ok=True)
    server.DATABASE_FILE = data_path / "chats.sqlite3"
    server.initialize_database()
    try:
        httpd = server.ThreadingHTTPServer(
            (server.BACKEND_HOST, server.BACKEND_PORT), server.Handler
        )
    except OSError:
        httpd = server.ThreadingHTTPServer((server.BACKEND_HOST, 0), server.Handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        server.refresh_system_info_in_background()
        webview.create_window(
            "Simon - TrygIT",
            f"http://{server.BACKEND_HOST}:{httpd.server_port}/",
            width=1100,
            height=800,
        )
        webview.start()
    finally:
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    main()
