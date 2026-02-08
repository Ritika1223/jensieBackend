import Filter from '../models/Filter.js';

// Get all filter values
export const getFilters = async (req, res) => {
  try {
    const filters = await Filter.find().sort({ filterType: 1 });
    
    // Convert to object format for easier frontend consumption
    const filtersObject = {};
    filters.forEach(filter => {
      filtersObject[filter.filterType] = filter.values;
    });

    res.json({
      success: true,
      data: filtersObject,
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Server error while fetching filters' });
  }
};

// Update filter values (create or update)
export const updateFilters = async (req, res) => {
  try {
    const { filters } = req.body; // Expected format: { specialist: [...], location: [...], experience: [...], gender: [...] }

    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({ error: 'Invalid filters data. Expected an object with filter types as keys.' });
    }

    const validFilterTypes = ['specialist', 'location', 'experience', 'gender'];
    const results = [];

    for (const [filterType, values] of Object.entries(filters)) {
      if (!validFilterTypes.includes(filterType)) {
        continue; // Skip invalid filter types
      }

      if (!Array.isArray(values)) {
        continue; // Skip if values is not an array
      }

      // Update or create filter
      const filter = await Filter.findOneAndUpdate(
        { filterType },
        { values },
        { upsert: true, new: true }
      );

      results.push({
        filterType: filter.filterType,
        values: filter.values,
      });
    }

    res.json({
      success: true,
      message: 'Filters updated successfully',
      data: results,
    });
  } catch (error) {
    console.error('Update filters error:', error);
    res.status(500).json({ error: 'Server error while updating filters' });
  }
};

// Get single filter by type
export const getFilterByType = async (req, res) => {
  try {
    const { filterType } = req.params;

    const validFilterTypes = ['specialist', 'location', 'experience', 'gender'];
    if (!validFilterTypes.includes(filterType)) {
      return res.status(400).json({ error: 'Invalid filter type' });
    }

    const filter = await Filter.findOne({ filterType });

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    res.json({
      success: true,
      data: {
        filterType: filter.filterType,
        values: filter.values,
      },
    });
  } catch (error) {
    console.error('Get filter by type error:', error);
    res.status(500).json({ error: 'Server error while fetching filter' });
  }
};

