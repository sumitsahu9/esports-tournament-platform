@echo off
echo ===================================================
echo   Vortex Esports - Auto Deploy to GitHub
echo ===================================================
echo.
echo 1. Staging changes...
git add .
echo.
echo 2. Committing changes...
git commit -m "Auto-update website: %%date%% %%time%%"
echo.
echo 3. Pushing to GitHub...
git push origin main
echo.
echo ===================================================
echo   Deploy Complete! Live site will update shortly.
echo ===================================================
pause
