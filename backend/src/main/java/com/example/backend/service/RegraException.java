package com.example.backend.service;

public class RegraException extends RuntimeException {
    public final int status;
    public RegraException(int status, String message) { super(message); this.status=status; }
}
