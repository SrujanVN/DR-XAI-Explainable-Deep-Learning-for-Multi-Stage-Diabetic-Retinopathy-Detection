# DR-XAI research interface

The React application connects to Flask through `/api/health`, `POST /api/analyses`, and the analysis retrieval/history routes. Completed predictions are stored in MongoDB. Predictions are returned only when trained model checkpoints are loaded; there is no synthetic prediction mode.

## Development

1. Copy `.env.example` to `.env` and set `MONGODB_URI` to your local MongoDB or Atlas connection string. The database name defaults to `dr_xai`.
2. Install the Python dependencies from `requirements.txt` and start the Flask application with `python app.py`.
3. In another terminal, install the frontend dependencies with `npm install`.
4. Start the Vite interface with `npm run dev` and open the local URL Vite prints.

Vite forwards `/api` and `/static` requests to Flask on `127.0.0.1:5000`. Leave `VITE_API_BASE_URL` blank for the local proxy. For a separate frontend origin, set it to the Flask API base (for example `http://localhost:5000/api`) and set `FRONTEND_ORIGIN` on Flask to that exact frontend origin.

## Production build

Run `npm run build`. Vite places the Flask-served bundle in `static/dr-xai/` and a local-preview bundle in `dist/`. Flask serves the first at `/` when it exists; the original Flask landing page remains available as a fallback before the build.

To view the compiled frontend without starting Flask, run `npm run preview -- --host 127.0.0.1` after the build and open `http://127.0.0.1:4173/`. Model analysis requires Flask and its configured model checkpoints; the research and project pages can be viewed without them.

The API accepts JPG, JPEG, and PNG images up to 12 MB under the multipart field `image`. It returns a unique `analysis_id`, prediction, averaged model probability distribution, model name/version, and timestamp. The record stores image metadata and a server-generated image reference; the image itself is kept in the ignored `backend/uploads/` directory. The API health endpoint reports the actual MongoDB connection state, and Analysis History is backed by paginated MongoDB records.

The report download is a JSON research record with no patient fields and references its `analysis_id`; generating it records report metadata on that analysis. Grad-CAM is marked available only when the API says it is present; SHAP is not implemented.
