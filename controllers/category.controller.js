const Category = require('../model/Category');

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { title, icon } = req.body;

        if (!title || !icon) {
            return res.status(400).json({ success: false, message: 'Title and Icon are required' });
        }

        const category = await Category.create({ title, icon });
        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
    }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
    }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch category', error: error.message });
    }
};

// Update a category by ID
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, icon, isActive } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { title, icon, isActive },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully', data: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
    }
};

// Delete a category by ID
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCategory = await Category.findByIdAndDelete(id);

        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
    }
};

exports.updateCategoryToggle = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const updatedCategory = await Category.findById(id);
        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'Category not found'
            })
        }
        updatedCategory.isActive = isActive;
        await updatedCategory.save();
        console.log("object",updatedCategory)
        res.status(200).json({
            success: true,
            message: 'Category status updated successfully',
            data: updatedCategory
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Failed to update category toggle',
            error: error.message
        })
    }
}