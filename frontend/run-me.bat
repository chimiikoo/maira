@echo off
echo Перенос картинок начался...
mkdir assets 2>nul

copy "C:\Users\Пользователь\.gemini\antigravity\brain\586ad45d-e05e-427b-a624-86c5a41f6f09\hero_manicure_luxury_1776096687007.png" "assets\hero.png"
copy "C:\Users\Пользователь\.gemini\antigravity\brain\586ad45d-e05e-427b-a624-86c5a41f6f09\salon_interior_luxury_1776096781656.png" "assets\interior.png"
copy "C:\Users\Пользователь\.gemini\antigravity\brain\586ad45d-e05e-427b-a624-86c5a41f6f09\pedicure_luxury_1776096847817.png" "assets\pedicure.png"

echo.
if exist "assets\hero.png" (
    echo [УСПЕШНО] Все картинки скопированы в папку assets!
) else (
    echo [ОШИБКА] Не удалось скопировать.
)
echo.
pause
