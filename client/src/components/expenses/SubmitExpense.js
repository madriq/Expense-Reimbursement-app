import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  MenuItem,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const validationSchema = yup.object({
  title: yup
    .string()
    .required('Title is required'),
  description: yup
    .string()
    .required('Description is required'),
  amount: yup
    .number()
    .positive('Amount must be positive')
    .required('Amount is required'),
  category: yup
    .string()
    .required('Category is required'),
  date: yup
    .date()
    .required('Date is required'),
});

const categories = [
  'Travel',
  'Meals',
  'Office Supplies',
  'Equipment',
  'Other',
];

const SubmitExpense = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      amount: '',
      category: '',
      date: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        if (!receipt) {
          setError('Please upload a receipt');
          return;
        }

        const formData = new FormData();
        formData.append('receipt', receipt);
        Object.keys(values).forEach(key => {
          formData.append(key, values[key]);
        });

        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/expenses', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        navigate('/dashboard');
      } catch (error) {
        setError(error.response?.data?.message || 'An error occurred');
      }
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size should be less than 5MB');
        return;
      }
      setReceipt(file);
      setError('');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Submit Expense
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={formik.handleSubmit}>
            <TextField
              margin="normal"
              fullWidth
              id="title"
              name="title"
              label="Title"
              value={formik.values.title}
              onChange={formik.handleChange}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
            />
            <TextField
              margin="normal"
              fullWidth
              id="description"
              name="description"
              label="Description"
              multiline
              rows={4}
              value={formik.values.description}
              onChange={formik.handleChange}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
            />
            <TextField
              margin="normal"
              fullWidth
              id="amount"
              name="amount"
              label="Amount"
              type="number"
              value={formik.values.amount}
              onChange={formik.handleChange}
              error={formik.touched.amount && Boolean(formik.errors.amount)}
              helperText={formik.touched.amount && formik.errors.amount}
            />
            <TextField
              margin="normal"
              fullWidth
              id="category"
              name="category"
              select
              label="Category"
              value={formik.values.category}
              onChange={formik.handleChange}
              error={formik.touched.category && Boolean(formik.errors.category)}
              helperText={formik.touched.category && formik.errors.category}
            >
              {categories.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="normal"
              fullWidth
              id="date"
              name="date"
              label="Date"
              type="date"
              value={formik.values.date}
              onChange={formik.handleChange}
              error={formik.touched.date && Boolean(formik.errors.date)}
              helperText={formik.touched.date && formik.errors.date}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{ mt: 2, mb: 2 }}
            >
              Upload Receipt
              <input
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
            </Button>
            {receipt && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selected file: {receipt.name}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
            >
              Submit Expense
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 1 }}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SubmitExpense; 