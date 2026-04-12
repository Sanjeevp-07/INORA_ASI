1️⃣ Pull latest code first
Before starting work they should run:
git pull origin main
This ensures they are working on the latest version.


2️⃣ Create a new branch
They should never work on main directly.
git checkout -b feature-mic-recorder

Example branch names:
feature-avatar
feature-voice
fix-navbar


3️⃣ Write code and commit
After editing files:

git add .
git commit -m "Updated MicRecorder component"


4️⃣ Push the branch to GitHub
git push origin feature-mic-recorder
Now the branch exists on GitHub.


5️⃣ Create the Pull Request on GitHub
After pushing, GitHub usually shows a button like:
Compare & Pull Request

Steps on GitHub:
Go to your repository
Click Pull Requests
Click New Pull Request
Select branches:

base: main
compare: feature-mic-recorder

Meaning:
feature-mic-recorder → main
Click Create Pull Request
Now you can review it and merge it.




**Visual workflow**
main branch
     │
     │ git pull
     ▼
create branch
     │
     │ code changes
     ▼
git push origin feature-branch
     │
     ▼
Pull Request → main