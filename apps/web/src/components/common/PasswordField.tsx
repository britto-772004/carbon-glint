import type { MouseEvent } from 'react';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

/**
 * Password input with a show/hide eye button. Components hold no state, so the toggle flips the
 * input's `type` and the button's icon/label directly (works inside uncontrolled forms).
 */
function toggle(e: MouseEvent<HTMLButtonElement>) {
  const button = e.currentTarget;
  const input = button.closest('.MuiInputBase-root')?.querySelector('input');
  if (!input) return;
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  button.dataset.visible = String(reveal);
  button.setAttribute('aria-pressed', String(reveal));
  button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
}

export function PasswordField({ slotProps, ...props }: Omit<TextFieldProps, 'type'>) {
  return (
    <TextField
      {...props}
      type="password"
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                aria-label="Show password"
                aria-pressed="false"
                onClick={toggle}
                // Keep focus in the field and don't submit the form.
                onMouseDown={(e) => e.preventDefault()}
                sx={{
                  '& .hide': { display: 'none' },
                  '&[data-visible="true"] .show': { display: 'none' },
                  '&[data-visible="true"] .hide': { display: 'inline-block' },
                }}
              >
                <Visibility className="show" fontSize="small" />
                <VisibilityOff className="hide" fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
