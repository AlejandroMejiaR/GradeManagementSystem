// frontend/pages/dashboard.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
    TextField, Grid, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';

// Pequeña función para decodificar el payload del JWT sin librerías externas
function decodeToken(token) {
    try {
        // atob está depreciado en Node.js pero funciona en navegadores. Para compatibilidad universal se puede usar Buffer.
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Error decoding token:", e.message);
        return null;
    }
}

export default function DashboardPage() {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState(null); // Estado para el rol
    const router = useRouter();

    // Estados para el formulario de nueva nota
    const [studentName, setStudentName] = useState('');
    const [subject, setSubject] = useState('');
    const [score, setScore] = useState('');
    
    // 1. Primer useEffect para obtener el rol del usuario del token
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        const decoded = decodeToken(token);
        const role = decoded?.role; // <-- Usando encadenamiento opcional

        if (role) {
            setUserRole(role);
        } else {
            // Si el token es inválido o no tiene rol, deslogueamos
            localStorage.removeItem('accessToken');
            router.push('/login');
        }
    }, []); // Se ejecuta solo una vez al cargar la página

    // 2. Segundo useEffect para cargar datos, se dispara cuando el rol del usuario es conocido
    useEffect(() => {
        if (userRole) {
            fetchGrades(userRole);
        }
    }, [userRole]); // Depende del estado userRole

    const fetchGrades = async (role) => {
        const token = localStorage.getItem('accessToken');
        const endpoint = role === 'profesor'
            ? `${process.env.NEXT_PUBLIC_API_URL}/grades/`
            : `${process.env.NEXT_PUBLIC_API_URL}/my-grades/`;

        try {
            setLoading(true);
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('accessToken');
                    router.push('/login');
                }
                throw new Error('No se pudieron cargar las calificaciones.');
            }
            const data = await response.json();
            setGrades(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        router.push('/login');
    };

    const handleAddGrade = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/grades/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ student_name: studentName, subject, score: Number.parseFloat(score) })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al añadir la calificación.');
            }
            
            setStudentName('');
            setSubject('');
            setScore('');
            fetchGrades(userRole); // Recargamos las notas
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Sistema de Calificaciones
                    </Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
                        Cerrar Sesión
                    </Button>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    {/* Renderizado Condicional: El formulario solo para profesores */}
                    {userRole === 'profesor' && (
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Añadir/Actualizar Calificación
                                    </Typography>
                                    <Box component="form" onSubmit={handleAddGrade}>
                                        <TextField label="Nombre del Estudiante" value={studentName} onChange={e => setStudentName(e.target.value)} fullWidth required margin="normal" />
                                        <TextField label="Materia" value={subject} onChange={e => setSubject(e.target.value)} fullWidth required margin="normal" />
                                        <TextField label="Nota (0-500)" type="number" value={score} onChange={e => setScore(e.target.value)} fullWidth required margin="normal" inputProps={{ step: "0.1", min: "0", max: "500" }} />
                                        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                                            Guardar Calificación
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* El listado de calificaciones ahora es dinámico */}
                    <Grid item xs={12} md={userRole === 'profesor' ? 8 : 12}>
                        <Typography variant="h6" gutterBottom>
                            {userRole === 'profesor' ? 'Listado de Calificaciones Creadas' : 'Mis Calificaciones'}
                        </Typography>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Estudiante</TableCell>
                                        <TableCell>Materia</TableCell>
                                        <TableCell align="right">Nota</TableCell>
                                        {userRole === 'profesor' && <TableCell align="center">Acciones</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && (
                                        <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                                    )}
                                    {!loading && error && (
                                        <TableRow><TableCell colSpan={4}><Alert severity="error">{error}</Alert></TableCell></TableRow>
                                    )}
                                    {!loading && !error && grades.length === 0 && (
                                        <TableRow><TableCell colSpan={4} align="center">No hay calificaciones para mostrar.</TableCell></TableRow>
                                    )}
                                    {!loading && !error && grades.length > 0 && (
                                        grades.map((grade) => (
                                            <TableRow key={grade.id}>
                                                <TableCell>{grade.student_name}</TableCell>
                                                <TableCell>{grade.subject}</TableCell>
                                                <TableCell align="right">{grade.score.toFixed(1)}</TableCell>
                                                {userRole === 'profesor' && (
                                                    <TableCell align="center">
                                                        <IconButton size="small" onClick={() => alert(`Funcionalidad Editar Próximamente`)}><EditIcon /></IconButton>
                                                        <IconButton size="small" onClick={() => alert(`Funcionalidad Eliminar Próximamente`)}><DeleteIcon /></IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}