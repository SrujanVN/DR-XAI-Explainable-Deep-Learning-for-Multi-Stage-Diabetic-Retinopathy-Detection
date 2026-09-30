# DR-XAI research interface

The React application uses the existing Flask inference stack through `/api/health` and `POST /api/predict`. Predictions are returned only when trained model checkpoints are loaded; there is no synthetic prediction mode.

## Development

1. Install the existing Python dependencies from `requirements.txt` and start the Flask application with `python app.py`.
2. In another terminal, install the frontend dependencies with `npm install`.
3. Start the Vite interface with `npm run dev` and open the local URL Vite prints.

Vite forwards `/api` and `/static` requests to Flask on `127.0.0.1:5000`. Copy `.env.example` to `.env` only when changing the model metadata or using a separately hosted API. Set `VITE_API_BASE_URL` to that API origin in the frontend environment.

## Production build

Run `npm run build`. Vite places the Flask-served bundle in `static/dr-xai/` and a local-preview bundle in `dist/`. Flask serves the first at `/` when it exists; the original Flask landing page remains available as a fallback before the build.

To view the compiled frontend without starting Flask, run `npm run preview -- --host 127.0.0.1` after the build and open `http://127.0.0.1:4173/`. Model analysis requires Flask and its configured model checkpoints; the research and project pages can be viewed without them.

The API accepts JPG, JPEG, and PNG images up to 12 MB under the multipart field `image`. It returns the predicted class, class label, majority-vote confidence, vote-fraction distribution, model name/version, and uploaded image URL. The confidence represents the fraction of successful model votes, not calibrated clinical certainty.

The report download is a JSON research record with no patient fields. Grad-CAM is shown only when a result response includes an explanation artifact; SHAP remains marked as future work.
