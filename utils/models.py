# utils/models.py
import torch
import torch.nn as nn
import timm
import os
from pathlib import Path
import numpy as np

# --- Define the Device ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device for models: {device}")

# --- Model Configuration (Update this with ALL your trained models) ---
# Dictionary mapping model names (keys) to their configuration
MODEL_CONFIGS = {
    'resnet18': {
        'timm_name': 'resnet18',
        'weights_path': 'models/resnet18_best_weights.pth'
    },
    'densenet121': {
        'timm_name': 'densenet121',
        'weights_path': 'models/densenet121_best_weights.pth'
    },
    # Add other models here as they finish training:
    'efficientnet_b0': { # <-- UNCOMMENT AND ADD/VERIFY THIS ENTRY
        'timm_name': 'efficientnet_b0', # Verify exact timm name used during training
        'weights_path': 'models/efficientnet_b0_best_weights.pth'
    },
    'resnext50_32x4d': { # <-- UNCOMMENT AND ADD/VERIFY THIS ENTRY
        'timm_name': 'resnext50_32x4d', # Verify exact timm name
        'weights_path': 'models/resnext50_32x4d_best_weights.pth'
    },
    # 'regnety_008': { # <-- UNCOMMENT AND ADD/VERIFY THIS ENTRY
    #     'timm_name': 'regnety_008', # Verify exact timm name used during training (e.g., regnety_008)
    #     'weights_path': 'models/regnety_008_best_weights.pth' # Verify filename matches screenshot
    # }
    # Ensure you have an entry for each of the 5 models you trained
}

NUM_CLASSES = 5
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# --- Load Trained Models (This function loads and returns) ---
def load_trained_models(model_configs=MODEL_CONFIGS):
    """
    Loads trained models based on the provided configuration.

    Returns:
        dict: A dictionary of loaded PyTorch models {model_name: model_instance}.
              Includes None for models that failed to load.
              Returns an empty dict if no models could be configured/loaded.
    """
    loaded_models = {}
    print("\nLoading trained models for inference...")

    if not model_configs:
        print("Warning: MODEL_CONFIGS is empty. No models to load.")
        return loaded_models # Return empty dict

    for name, config in model_configs.items():
        timm_name = config.get('timm_name')
        weights_path = config.get('weights_path')

        if not timm_name or not weights_path:
             print(f"Warning: Incomplete config for model {name}. Skipping.")
             loaded_models[name] = None
             continue

        resolved_weights_path = Path(weights_path)
        if not resolved_weights_path.is_absolute():
            resolved_weights_path = PROJECT_ROOT / resolved_weights_path
        if not resolved_weights_path.is_file():
            print(f"Warning: Model weights not found for {name} at {resolved_weights_path}. Skipping.")
            loaded_models[name] = None
            continue

        try:
            print(f"Loading {name} from {resolved_weights_path}...")
            # Create the model architecture (pretrained=False as we load our own weights)
            model = timm.create_model(timm_name, pretrained=False, num_classes=NUM_CLASSES)

            # Load the saved state dictionary
            state_dict = torch.load(resolved_weights_path, map_location=device, weights_only=True)

            # Load the state dict into the model
            model.load_state_dict(state_dict)

            # Move model to the specified device
            model = model.to(device)

            # Set model to evaluation mode
            model.eval()

            loaded_models[name] = model
            print(f"Successfully loaded {name}")

        except Exception as e:
            print(f"Error loading model {name}: {e}")
            loaded_models[name] = None

    if not loaded_models or not any(model is not None for model in loaded_models.values()):
         print("Warning: No models were loaded successfully from configured paths.")
    else:
         print("Models loaded successfully into the dictionary.")

    return loaded_models

# --- Function to initialize models (calls load_trained_models) ---
# This function now just orchestrates loading, it doesn't set a global variable
def initialize_models():
     # Call load_trained_models and return its result
     return load_trained_models() # This is called by app.py and result is stored in app.config


# --- Ensemble Prediction Logic (Majority Voting) ---
def predict_ensemble(image_tensor, loaded_models):
    """
    Performs inference using multiple models and combines predictions by majority voting.

    Args:
        image_tensor (torch.Tensor): The preprocessed and normalized image tensor (1xCxHxW).
        loaded_models (dict): Dictionary of loaded PyTorch models {model_name: model_instance}.

    Returns:
        dict: Results including individual predictions, ensemble prediction, and confidences.
              Returns None if no models are loaded or inference fails.
    """
    if not loaded_models or not any(model is not None for model in loaded_models.values()):
        print("Error: No models loaded or available in the passed dictionary for ensemble prediction.")
        return None

    individual_results = {}
    successful_probabilities = []

    with torch.no_grad():
        for name, model in loaded_models.items():
            if model is None:
                print(f"Skipping inference for {name} (model not loaded or None in dict).")
                continue

            try:
                if not list(model.parameters()):
                     print(f"Warning: Model {name} has no parameters. Skipping.")
                     individual_results[name] = {'error': 'Model has no parameters.'}
                     continue

                model_device = next(model.parameters()).device
                input_tensor = image_tensor.to(model_device)

                outputs = model(input_tensor)
                probs = torch.softmax(outputs, dim=1)
                _, predicted_class_idx = torch.max(outputs, 1)
                predicted_class = predicted_class_idx.item()
                confidence = probs[0, predicted_class].item()

                individual_results[name] = {
                    'predicted_class': predicted_class,
                    'confidence': confidence,
                    'probabilities': probs[0].cpu().numpy().tolist()
                }
                successful_probabilities.append(probs[0].detach().cpu())


            except Exception as e:
                print(f"Error during inference for model {name}: {e}")
                individual_results[name] = {'error': str(e)}

    # --- Ensemble Prediction (soft vote over each successful model) ---
    ensemble_prediction = None
    ensemble_probabilities = []
    ensemble_confidence = 0.0

    if successful_probabilities:
        mean_probabilities = torch.stack(successful_probabilities).mean(dim=0)
        ensemble_prediction = int(mean_probabilities.argmax().item())
        ensemble_probabilities = mean_probabilities.tolist()
        ensemble_confidence = float(mean_probabilities[ensemble_prediction].item())

    else:
        print("No successful model predictions to form ensemble.")


    # --- Format results for display/reports ---
    model_results_text = "Individual Model Results:\n"
    if individual_results:
        for name, res in individual_results.items():
            if 'error' in res:
                model_results_text += f"- {name}: Error during inference - {res['error']}\n"
            else:
                 model_results_text += f"- {name}: Stage {res['predicted_class']} (Confidence: {res['confidence']:.4f})\n"
    else:
        model_results_text += "No individual model results available.\n"


    model_results_text += f"\nEnsemble Prediction (Mean Probability):\n"
    if ensemble_prediction is not None:
        model_results_text += f"- Predicted Stage: {ensemble_prediction} (Confidence: {ensemble_confidence:.4f})\n"
    elif individual_results:
        model_results_text += "- Could not determine (no clear majority or all failed).\n"
    else:
         model_results_text += "- No models were available for prediction.\n"


    return {
        'individual_results': individual_results,
        'ensemble_prediction': ensemble_prediction,
        'ensemble_probabilities': ensemble_probabilities,
        'ensemble_confidence': ensemble_confidence,
        'successful_model_count': len(successful_probabilities),
        'model_results_text': model_results_text
    }

# --- End of utils/models.py ---
