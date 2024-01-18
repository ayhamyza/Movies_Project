const { response } = require("express")
const knex = require("../database/knex")
const AppError = require('../utils/AppError') 
const sqliteConnection = require('../database/sqlite') 

    class NotesController {
        async create(request, response) {
            try {
                console.log("Create function is called.");
    
                const { title, description, rating, tags } = request.body;
                const { user_id } = request.params;
    
                if (rating > 5) {
                    throw new AppError("Nota deve ser até 5.");
                }
    
                const [note_id] = await knex("movie_notes").insert({
                    title,
                    description,
                    rating,
                    user_id
                });
    
                const tagsInsert = tags.map(name => {
                    return {
                        note_id,
                        user_id,
                        name
                    };
                });
    
                console.log("Inserting tags:", tagsInsert);
                await knex("tags").insert(tagsInsert);
                console.log("Tags inserted successfully.");
    
                response.json();
            } catch (error) {
                response.status(400).json({ error: error.message });
            }
        }

    async show(request, response) { 
        const { id } = request.params

        const note = await knex("movie_notes").where({ id }).first()
        const tags = await knex("tags").where({ note_id: id }).orderBy("name")

        return response.json({
            ...note,
            tags   
        })
    }

    async delete (request, response) { 
        const { id } = request.params

        await knex ("movie_notes").where({ id }).delete()

        return response.json()
    }

    async index (request, response) { 
        const { title, user_id, tags } = request.query

        let notes

        if(tags) { 
            const filterTags = tags.split(',').map(tag => tag.trim()) 

            notes = await knex ("tags")
                .select ([
                    "movie_notes.id",
                    "movie_notes.title",
                    "movie_notes.user_id",
                ])
                .where("movie_notes.user_id", user_id)
                .whereLike("movie_notes.title", `%${title}%`)
                .whereIn("name", filterTags)
                .innerJoin("movie_notes", "movie_notes.id", "tags.note_id")
                .orderBy("movie_notes.title")
                
        } else{ 
            notes = await knex ("movie_notes")
                .where ({ user_id })
                .whereLike("title", `%${title}%`)
                .orderBy("title")
            }

        const userTags = await knex ("tags").where({  user_id })
        const notesWithTags = notes.map(note => {
            const noteTags = userTags.filter(tag => tag.note_id === note.id)
            return {
                ...note,
                tags:noteTags
            }
        })
        return response.json(notesWithTags);
    }

   

  
    async update(request, response) {
    try {
    const { rating } = request.body;
    const { id } = request.params;

    
    const database = await sqliteConnection();

    
    await database.run('UPDATE movie_notes SET rating = ? WHERE id = ?', [rating, id]);

    
    if (rating < 0 || rating > 5) {
      throw new AppError('Nota inválida, somente de 0 a 5');
    }

    return response.json({ message: 'Classificação atualizada com sucesso' });
    } catch (error) {
    
    return response.status(500).json({ error: error.message });
   }
   }

}

module.exports = NotesController;


