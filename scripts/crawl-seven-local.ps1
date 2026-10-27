# 세븐일레븐 로컬 수집 — Windows 작업 스케줄러에서 실행한다.
#
# 세븐일레븐은 데이터센터 IP(GitHub Actions)를 차단해 CI에서 수집되지 않는다.
# 가정용 IP인 이 PC에서 매월 1일 00:10 / 1일·15일 09:30 에 돌린다.
# 환경변수는 crawler/.env 에서 읽는다 (crawler/main.py 의 load_dotenv).
#
# 작업 등록:  powershell -ExecutionPolicy Bypass -File scripts\crawl-seven-local.ps1 -Register
# 작업 삭제:  schtasks /Delete /TN "PyeonPick\Seven*" /F   (두 작업 각각)
# 로그 위치:  %LOCALAPPDATA%\pyeonpick\logs\seven-*.log
param([switch]$Register)

$repo = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repo 'crawler\.venv\Scripts\python.exe'
$logDir = Join-Path $env:LOCALAPPDATA 'pyeonpick\logs'

if ($Register) {
    $action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    schtasks /Create /F /TN 'PyeonPick\SevenMonthStart' /SC MONTHLY /D 1 /ST 00:10 /TR $action | Out-Null
    schtasks /Create /F /TN 'PyeonPick\SevenRegular' /SC MONTHLY /D 1,15 /ST 09:30 /TR $action | Out-Null
    # PC가 꺼져 있어 놓친 실행은 켜진 직후 실행한다
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    Set-ScheduledTask -TaskPath '\PyeonPick\' -TaskName 'SevenMonthStart' -Settings $settings | Out-Null
    Set-ScheduledTask -TaskPath '\PyeonPick\' -TaskName 'SevenRegular' -Settings $settings | Out-Null
    Write-Output '작업 스케줄러 등록 완료: PyeonPick\SevenMonthStart, PyeonPick\SevenRegular'
    exit 0
}

New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ('seven-{0:yyyyMMdd-HHmm}.log' -f (Get-Date))

if (-not (Test-Path $venvPython)) {
    python -m venv (Join-Path $repo 'crawler\.venv')
    & $venvPython -m pip install --quiet httpx 'beautifulsoup4>=4.12.0' 'supabase>=2.3.0' python-dotenv 'pywebpush>=1.14.0'
}

$env:PYTHONIOENCODING = 'utf-8'
Set-Location $repo
# PowerShell 5.1은 네이티브 stderr를 오류 레코드로 감싸므로 cmd로 리다이렉트한다
cmd /c "`"$venvPython`" -m crawler.main --stores seven > `"$log`" 2>&1"
exit $LASTEXITCODE
