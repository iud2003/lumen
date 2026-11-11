# Proposed AI Effects Copilot

A contextual chat panel can turn requests such as “make the background cinematic” or “suggest three looks for a football entrance” into effect proposals for the selected layer.

Start with the controls already implemented: brightness, contrast, saturation, opacity, blend mode, position, scale, rotation, fit/fill, and transitions. The assistant should explain each proposal and provide **Preview**, **Apply Live**, and **Undo** actions. Preview an AI proposal separately; applying it should use the same validated live-control command as a manual adjustment.

Send the selected layer's settings, canvas dimensions, media type, and user description as context. Optional frame analysis can be added when the user chooses to share a representative frame. Full videos are unnecessary for the first version.

Use structured function arguments constrained to supported controls, then validate values and layer IDs in the desktop backend. Store credentials in the desktop main process or a backend, separate from renderer code. Keep chat requests independent of playback so visuals keep running while a response is generated or the connection is unavailable.

Suggested tools:

- `suggest_layer_looks`: return named looks with explanations and supported parameter values.
- `preview_layer_look`: apply a proposal only to the Preview monitor.
- `apply_layer_look`: apply the chosen proposal to Composition through the live-controls API.
- `undo_layer_look`: restore the previous settings for the affected layer.

Later additions could include reusable show looks, media tagging, scene recommendations, and assistance interpreting LED wall measurements. Shader effects, beat-reactive animation, and automatic camera calibration need their own playback or calibration implementations before chat can control them.

Official implementation reference: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), including strict tool schemas. This is a design recommendation; Studio 1.3 does not make AI API calls.
