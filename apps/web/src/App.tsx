import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { HealthContainer } from './containers/HealthContainer';

export function App() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Carbon Glint
      </Typography>
      <HealthContainer />
    </Container>
  );
}
