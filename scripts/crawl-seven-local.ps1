# 세븐일레븐 로컬 수집 — Windows 작업 스케줄러에서 실행한다.
#
# 세븐일레븐은 데이터센터 IP(GitHub Actions)를 차단해 CI에서 수집되지 않는다.
# 가정용 IP인 이 PC에서 매월 1일 00:10 / 1일·15일 09:30 에 돌린다.
# 환경변수는 crawler/.env 에서 읽는다 (crawler/main.py 의 load_dotenv).
#
# 작업 등록:  powershell -ExecutionPolicy Bypass -File C:\toy_project\pyeonpick\scripts\crawl-seven-local.ps1 -Register
# 작업 삭제:  schtasks /Delete /F /TN PyeonPick\SevenMonthStart  (SevenDay1, SevenDay15도 각각)
# 로그 위치:  %LOCALAPPDATA%\pyeonpick\logs\seven-*.log
param([switch]$Register)

$repo = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repo 'crawler\.venv\Scripts\python.exe'
$logDir = Join-Path $env:LOCALAPPDATA 'pyeonpick\logs'

if ($Register) {
    # 월간 트리거는 New-ScheduledTaskTrigger가 지원하지 않아 schtasks로 만든다.
    # 단 PowerShell 5.1은 네이티브 인자 속 큰따옴표를 깨뜨리므로 /TR엔 따옴표 없는 실행 파일만 넣고,
    # 실제 실행 인자는 Set-ScheduledTask로 덮어쓴다.
    # schtasks MONTHLY의 /D는 날짜 하나만 받는다 (1,15 불가) — 날짜마다 작업을 따로 만든다
    $schedules = @(
        @{ Name = 'SevenMonthStart'; Day = '1';  Time = '00:10' },
        @{ Name = 'SevenDay1';       Day = '1';  Time = '09:30' },
        @{ Name = 'SevenDay15';      Day = '15'; Time = '09:30' }
    )
    foreach ($schedule in $schedules) {
        schtasks /Create /F /TN "PyeonPick\$($schedule.Name)" /SC MONTHLY /D $schedule.Day /ST $schedule.Time /TR powershell.exe
        if ($LASTEXITCODE -ne 0) { Write-Error "$($schedule.Name) 작업 생성 실패"; exit 1 }
    }
    # 이전 버전 스크립트가 만들다 실패한 작업이 남아 있으면 지운다
    schtasks /Delete /F /TN 'PyeonPick\SevenRegular' 2>$null | Out-Null

    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
        -WorkingDirectory $repo
    # PC가 꺼져 있어 놓친 실행은 켜진 직후 실행한다
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    foreach ($schedule in $schedules) {
        Set-ScheduledTask -TaskPath '\PyeonPick\' -TaskName $schedule.Name -Action $action -Settings $settings | Out-Null
    }
    Write-Output '작업 스케줄러 등록 완료: PyeonPick\SevenMonthStart(1일 00:10), SevenDay1(1일 09:30), SevenDay15(15일 09:30)'
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
