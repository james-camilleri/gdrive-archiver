@echo off
setlocal enabledelayedexpansion

7z a %1.__archive.7z %1\* -xr^^!node_modules -mx=9
7z t %1.__archive.7z

if %errorlevel% == 0 (
  for /f "skip=1 tokens=* delims=" %%# in ('certutil -hashfile %1.__archive.7z MD5') do (
    if not defined md5 (
      set md5=%%#
    )
  )

  move %1.__archive.7z %1.!md5!.archive.7z
  rmdir /s /q %1
)

pause

endlocal
