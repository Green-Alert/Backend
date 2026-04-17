import assert from 'assert';
import UsuarioModel from '../../src/models/usuario.model.js';

const testName = 'Usuario Model - Pagination (LIMIT/OFFSET)';

export const tests = [
  {
    name: `${testName} - Should find all users without pagination`,
    run: async () => {
      // Arrange: No limit/offset provided
      const result = await UsuarioModel.findAll({});
      
      // Assert: Should return array (even if empty)
      assert(Array.isArray(result), 'Result should be an array');
    }
  },

  {
    name: `${testName} - Should apply LIMIT correctly`,
    run: async () => {
      // Arrange: Set limit to 2
      const result = await UsuarioModel.findAll({ limit: 2 });
      
      // Assert: Should return at most 2 records
      assert(result.length <= 2, `Expected at most 2 records, got ${result.length}`);
    }
  },

  {
    name: `${testName} - Should apply LIMIT and OFFSET correctly`,
    run: async () => {
      // Arrange: Get page 2 with 2 records per page
      const page1 = await UsuarioModel.findAll({ limit: 2, offset: 0 });
      const page2 = await UsuarioModel.findAll({ limit: 2, offset: 2 });
      
      // Assert: Different records on each page (if data exists)
      if (page1.length > 0 && page2.length > 0) {
        const page1Ids = page1.map(u => u.id_usuario);
        const page2Ids = page2.map(u => u.id_usuario);
        
        const hasDifference = !page1Ids.every(id => page2Ids.includes(id));
        assert(hasDifference || page1.length < 2, 'Pagination should return different records');
      }
    }
  },

  {
    name: `${testName} - Should reject negative LIMIT`,
    run: async () => {
      // Arrange & Act & Assert: Should throw error for negative limit
      try {
        await UsuarioModel.findAll({ limit: -1 });
        assert.fail('Should have thrown error for negative limit');
      } catch (error) {
        assert(
          error.message.includes('limit must be a non-negative integer'),
          `Expected error about limit, got: ${error.message}`
        );
      }
    }
  },

  {
    name: `${testName} - Should reject negative OFFSET`,
    run: async () => {
      // Arrange & Act & Assert: Should throw error for negative offset
      try {
        await UsuarioModel.findAll({ limit: 10, offset: -1 });
        assert.fail('Should have thrown error for negative offset');
      } catch (error) {
        assert(
          error.message.includes('offset must be a non-negative integer'),
          `Expected error about offset, got: ${error.message}`
        );
      }
    }
  },

  {
    name: `${testName} - Should reject non-numeric LIMIT`,
    run: async () => {
      // Arrange & Act & Assert: Should throw error for non-numeric limit
      try {
        await UsuarioModel.findAll({ limit: 'abc' });
        assert.fail('Should have thrown error for non-numeric limit');
      } catch (error) {
        assert(
          error.message.includes('limit must be a non-negative integer'),
          `Expected error about limit validation, got: ${error.message}`
        );
      }
    }
  },

  {
    name: `${testName} - Should handle LIMIT with search filter`,
    run: async () => {
      // Arrange: Add search with pagination
      const result = await UsuarioModel.findAll({ 
        search: 'test', 
        limit: 5 
      });
      
      // Assert: Should return array with max 5 records
      assert(Array.isArray(result), 'Result should be an array');
      assert(result.length <= 5, 'Should respect limit even with search filter');
    }
  },

  {
    name: `${testName} - Should handle LIMIT with role filter`,
    run: async () => {
      // Arrange: Add role filter with pagination
      const result = await UsuarioModel.findAll({ 
        rol: 'ciudadano', 
        limit: 10,
        offset: 0
      });
      
      // Assert: Should return array with correct constraints
      assert(Array.isArray(result), 'Result should be an array');
      assert(result.length <= 10, 'Should respect limit');
      result.forEach(user => {
        assert.strictEqual(user.rol, 'ciudadano', 'Should filter by role');
      });
    }
  },

  {
    name: `${testName} - Should handle OFFSET without LIMIT (should be ignored)`,
    run: async () => {
      // Arrange: Pass offset without limit
      const result = await UsuarioModel.findAll({ offset: 5 });
      
      // Assert: Should return all records (offset ignored without limit)
      assert(Array.isArray(result), 'Result should be an array');
    }
  },

  {
    name: `${testName} - Should handle zero LIMIT`,
    run: async () => {
      // Arrange & Act
      const result = await UsuarioModel.findAll({ limit: 0 });
      
      // Assert: Valid but returns no records
      assert(Array.isArray(result), 'Result should be an array');
      assert.strictEqual(result.length, 0, 'LIMIT 0 should return no records');
    }
  }
];
